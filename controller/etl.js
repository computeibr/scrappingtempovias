require('dotenv').config();
const axios = require('axios');
const cron = require('node-cron');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const TempoVias = require('../models/tempovias');

// Número de abas paralelas — ajuste conforme os recursos da máquina:
//   2 vCPU /  8 GB → ETL_CONCURRENCY=8
//   4 vCPU / 16 GB → ETL_CONCURRENCY=15
const CONCURRENCY = parseInt(process.env.ETL_CONCURRENCY || '8', 10);

// Delay entre abertura de cada aba (ms) — evita pico de CPU ao iniciar.
// Aumente se o servidor for mais fraco (ex: 3000).
const TAB_OPEN_DELAY = parseInt(process.env.ETL_TAB_DELAY || '2000', 10);

// Modo rápido experimental: usa domcontentloaded + espera fixa em vez de networkidle2.
// Ative com ETL_FAST_MODE=true e monitore a qualidade dos dados coletados.
const FAST_MODE = process.env.ETL_FAST_MODE === 'true';

// ─── Alertas ─────────────────────────────────────────────────────────────────
let falhasConsecutivas = 0;
let alertaJaEnviado = false;

async function enviarAlertaEmail(mensagem) {
  if (!process.env.ALERT_EMAIL || !process.env.ALERT_EMAIL_PASS) return;
  if (alertaJaEnviado) return;
  alertaJaEnviado = true;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.ALERT_EMAIL, pass: process.env.ALERT_EMAIL_PASS },
  });

  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  try {
    await transporter.sendMail({
      from: `"Tempovias Monitor" <${process.env.ALERT_EMAIL}>`,
      to: process.env.ALERT_EMAIL_TO || process.env.ALERT_EMAIL,
      subject: '⚠️ Tempovias — Scraping com falha',
      text: [
        'Alerta gerado automaticamente pelo Tempovias.',
        '',
        `Data/hora: ${agora}`,
        `Falhas consecutivas: ${falhasConsecutivas}`,
        '',
        'Erro:',
        mensagem,
        '',
        'Verifique os logs com: pm2 logs my-app',
      ].join('\n'),
    });
    console.log('Alerta de falha enviado por e-mail.');
  } catch (err) {
    console.error('Falha ao enviar alerta de e-mail:', err.message);
  }
}

// ─── Scraping de uma rota ─────────────────────────────────────────────────────
async function getTempoVias(page, url, name, viaId) {
  const urlFinal = url.includes('travelmode=')
    ? url
    : url + (url.includes('?') ? '&' : '?') + 'travelmode=driving';

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (FAST_MODE) {
        // Modo rápido: carrega só o HTML e aguarda 3s para o JS do Maps renderizar.
        // Mais veloz, mas depende de timing fixo — monitore a qualidade dos dados.
        await page.goto(urlFinal, { waitUntil: 'domcontentloaded', timeout: 40000 });
        await new Promise(r => setTimeout(r, 3000));
      } else {
        // Modo padrão: aguarda a rede estabilizar (mais confiável, mais lento).
        await page.goto(urlFinal, { waitUntil: 'networkidle2', timeout: 60000 });
      }

      await page.waitForXPath("//div[contains(text(), 'min') or contains(text(), 'h')]", { timeout: 20000 });
      await page.waitForXPath("//div[contains(text(), 'km')]", { timeout: 20000 });

      const minElement = await page.$x(
        "//div[not(ancestor::button) and not(ancestor::li[contains(@class,'modes')]) " +
        "and (contains(text(),' min') or (contains(text(),' h ') and contains(text(),'min'))) " +
        "and string-length(normalize-space(text())) < 20]"
      );
      const minTime = await page.evaluate(el => el.textContent.trim(), minElement[0]);

      const kmElement = await page.$x(
        "//div[not(ancestor::button) and contains(text(),' km') and string-length(normalize-space(text())) < 15]"
      );
      const km = await page.evaluate(el => el.textContent.trim(), kmElement[0]);

      console.log(`Id: ${viaId} | Nome: ${name} | Tempo: "${minTime}" | km: "${km}"`);

      await TempoVias.create({
        nomedarota: name,
        tempo: minTime.toString(),
        km: km.toString(),
        leitura: new Date(),
        viaId,
      });
      return; // sucesso
    } catch (error) {
      if (attempt < 2) {
        console.log(`Tentando novamente: ${name}`);
        // Backoff progressivo: evita reintentar imediatamente em rota sobrecarregada
        await new Promise(r => setTimeout(r, 2000 * attempt));
      } else {
        console.error(`Falha permanente: ${name} — ${error.message}`);
      }
    }
  }
}

// ─── Worker — pega rotas da fila compartilhada até ela esvaziar ───────────────
// Melhoria 2: worker pool dinâmico.
// Cada aba processa a próxima rota disponível, em vez de um lote fixo pré-dividido.
// Isso evita que uma aba fique ociosa enquanto outra ainda processa rotas lentas.
async function worker(browser, fila, id) {
  const page = await browser.newPage();
  try {
    while (fila.length > 0) {
      const rota = fila.shift();
      if (!rota) continue;
      await getTempoVias(page, rota.url, rota.name, rota.id);
    }
  } finally {
    await page.close().catch(() => {});
  }
}

// ─── Ciclo principal ──────────────────────────────────────────────────────────
async function agendamentoDefinido() {
  let browser;
  try {
    const { data } = await axios.get('http://localhost:3001/rota/rotasvia');
    const fila = [...data.rotasvias]; // cópia mutável para os workers consumirem

    const inicio = Date.now();
    console.log(`Iniciando ciclo: ${fila.length} rotas em até ${CONCURRENCY} abas paralelas.${FAST_MODE ? ' [FAST MODE]' : ''}`);

    browser = await puppeteer.launch({
      headless: 'new',
      protocolTimeout: 120000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
      ],
    });

    // Melhoria 3: abre as abas com delay escalonado para evitar pico de CPU.
    // Cada worker começa a processar rotas assim que sua aba abre, sem esperar
    // as demais — o delay só atrasa a abertura, não o processamento.
    const promises = [];
    const abas = Math.min(CONCURRENCY, fila.length);
    for (let i = 0; i < abas; i++) {
      promises.push(worker(browser, fila, i));
      if (i < abas - 1) {
        await new Promise(r => setTimeout(r, TAB_OPEN_DELAY));
      }
    }

    await Promise.all(promises);

    const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log(`Ciclo concluído em ${segundos}s (${data.rotasvias.length} rotas, ${abas} abas).`);

    falhasConsecutivas = 0;
    alertaJaEnviado = false;

  } catch (error) {
    falhasConsecutivas++;
    console.error(`Erro no ciclo de scraping (falha ${falhasConsecutivas}):`, error.message);
    if (falhasConsecutivas >= 3) {
      await enviarAlertaEmail(error.message || String(error));
    }
  } finally {
    if (browser) await browser.close();
  }
}

// ─── Cron ─────────────────────────────────────────────────────────────────────
let isRunning = false;

cron.schedule('*/5 * * * *', async () => {
  if (isRunning) {
    console.log('Ciclo anterior ainda em execução. Aguardando próximo tick.');
    return;
  }
  isRunning = true;
  try {
    await agendamentoDefinido();
  } finally {
    isRunning = false;
  }
}, { timezone: 'America/Sao_Paulo' });

// Executa imediatamente ao iniciar — usa o mesmo guard do cron para evitar
// sobreposição caso o primeiro tick do cron dispare antes do ciclo inicial terminar.
(async () => {
  isRunning = true;
  try {
    await agendamentoDefinido();
  } finally {
    isRunning = false;
  }
})();
