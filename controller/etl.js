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

// ─── Scraping de uma rota (roda em uma aba já aberta) ────────────────────────
async function getTempoVias(page, url, name, viaId) {
  const urlFinal = url.includes('travelmode=')
    ? url
    : url + (url.includes('?') ? '&' : '?') + 'travelmode=driving';

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(urlFinal, { waitUntil: 'networkidle2', timeout: 60000 });

      await page.waitForXPath("//div[contains(text(), 'min') or contains(text(), 'h')]", { timeout: 60000 });
      await page.waitForXPath("//div[contains(text(), 'km')]", { timeout: 60000 });

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
      } else {
        console.error(`Falha permanente: ${name} — ${error.message}`);
      }
    }
  }
}

// ─── Processa uma lista de rotas em uma aba dedicada ─────────────────────────
async function processarLote(browser, rotas) {
  const page = await browser.newPage();
  try {
    for (const rota of rotas) {
      await getTempoVias(page, rota.url, rota.name, rota.id);
    }
  } finally {
    await page.close();
  }
}

// ─── Ciclo principal ──────────────────────────────────────────────────────────
async function agendamentoDefinido() {
  let browser;
  try {
    const { data } = await axios.get('http://localhost:3001/rota/rotasvia');
    const rotas = data.rotasvias;

    // Divide as rotas em lotes iguais (um lote por aba paralela)
    const lotes = Array.from({ length: CONCURRENCY }, (_, i) =>
      rotas.filter((_, idx) => idx % CONCURRENCY === i)
    ).filter(l => l.length > 0);

    const inicio = Date.now();
    console.log(`Iniciando ciclo: ${rotas.length} rotas em ${lotes.length} abas paralelas.`);

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

    await Promise.all(lotes.map(lote => processarLote(browser, lote)));

    const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log(`Ciclo concluído em ${segundos}s (${rotas.length} rotas, ${CONCURRENCY} abas).`);

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

// Executa imediatamente ao iniciar
agendamentoDefinido();
