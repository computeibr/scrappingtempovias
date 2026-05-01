require('dotenv').config();
const axios = require('axios');
const cron = require('node-cron');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const TempoVias = require('../models/tempovias');
const sequelize = require('../models/db');

// Chave arbitrária única para o advisory lock do PostgreSQL (identifica este processo ETL)
const ETL_LOCK_KEY = 737465;

// Número de abas paralelas.
//   8 vCPU / 32 GB → ETL_CONCURRENCY=20 (produção atual)
//   Com 300 rotas: 20 abas × ~15 rotas/aba × ~7s/rota ≈ 1,75 min por ciclo
const CONCURRENCY = parseInt(process.env.ETL_CONCURRENCY || '8', 10);

// Delay entre abertura de abas (ms). Com request interception ativo, abas são leves.
// Reduzido de 2000 para 500 — ciclo termina mais rápido, menos tempo em CPU elevada.
const TAB_OPEN_DELAY = parseInt(process.env.ETL_TAB_DELAY || '500', 10);

// Modo rápido: domcontentloaded + espera fixa em vez de networkidle2.
const FAST_MODE = process.env.ETL_FAST_MODE === 'true';

// Número de ciclos antes de reciclar o browser (evita memory leak).
// Default: 12 ciclos ≈ 1h com rotas rápidas; ajuste conforme volume de rotas.
const MAX_CICLOS_BROWSER = parseInt(process.env.ETL_BROWSER_RECYCLE || '12', 10);

// Flags do Chrome que reduzem CPU/memória sem afetar extração de dados.
const CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-zygote',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-hang-monitor',
  '--disable-sync',
  '--disable-translate',
  '--metrics-recording-only',
  '--no-default-browser-check',
  '--no-first-run',
  '--safebrowsing-disable-auto-update',
];

// ─── Alertas ─────────────────────────────────────────────────────────────────
let falhasConsecutivas = 0;
let alertaJaEnviado = false;

async function enviarAlertaEmail(mensagem) {
  if (!process.env.ALERT_EMAIL || !process.env.ALERT_EMAIL_PASS) {
    console.warn('ETL: alerta de e-mail ignorado — ALERT_EMAIL ou ALERT_EMAIL_PASS não configurados.');
    return;
  }
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
        'Verifique os logs no EasyPanel.',
      ].join('\n'),
    });
    console.log('Alerta de falha enviado por e-mail.');
  } catch (err) {
    console.error('Falha ao enviar alerta de e-mail:', err.message);
  }
}

// ─── Browser persistente ──────────────────────────────────────────────────────
// Reutiliza o processo Chromium entre ciclos para eliminar o custo de
// launch/close a cada 5 minutos. Reciclado automaticamente após MAX_CICLOS_BROWSER.
let browserInstance = null;
let ciclosBrowser = 0;

async function obterBrowser() {
  const reutilizavel =
    browserInstance &&
    ciclosBrowser < MAX_CICLOS_BROWSER &&
    browserInstance.isConnected();

  if (reutilizavel) {
    return browserInstance;
  }

  if (browserInstance) {
    console.log(`ETL: reciclando browser após ${ciclosBrowser} ciclo(s).`);
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }

  ciclosBrowser = 0;
  browserInstance = await puppeteer.launch({
    headless: 'new',
    protocolTimeout: 120000,
    args: CHROME_ARGS,
  });
  return browserInstance;
}

// ─── Scraping de uma rota ─────────────────────────────────────────────────────
async function getTempoVias(page, url, name, viaId) {
  const urlFinal = url.includes('travelmode=')
    ? url
    : url + (url.includes('?') ? '&' : '?') + 'travelmode=driving';

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (FAST_MODE) {
        await page.goto(urlFinal, { waitUntil: 'domcontentloaded', timeout: 40000 });
        await new Promise(r => setTimeout(r, 3000));
      } else {
        await page.goto(urlFinal, { waitUntil: 'networkidle2', timeout: 60000 });
      }

      await page.waitForXPath("//div[contains(text(), 'min') or contains(text(), 'h')]", { timeout: 20000 });
      await page.waitForXPath(
        "//div[contains(text(),'km') or (contains(text(),' m') and not(contains(text(),'min')))]",
        { timeout: 20000 }
      );

      const minElement = await page.$x(
        "//div[not(ancestor::button) and not(ancestor::li[contains(@class,'modes')]) " +
        "and (contains(text(),' min') or (contains(text(),' h ') and contains(text(),'min'))) " +
        "and string-length(normalize-space(text())) < 20]"
      );
      if (!minElement[0]) throw new Error(`Elemento de tempo não encontrado para "${name}"`);
      const minTime = await page.evaluate(el => el.textContent.trim(), minElement[0]);

      const kmElement = await page.$x(
        "//div[not(ancestor::button) " +
        "and (contains(text(),' km') or (contains(text(),' m') and not(contains(text(),'min')))) " +
        "and string-length(normalize-space(text())) < 15]"
      );
      if (!kmElement[0]) throw new Error(`Elemento de distância não encontrado para "${name}"`);
      const km = await page.evaluate(el => el.textContent.trim(), kmElement[0]);

      console.log(`Id: ${viaId} | Nome: ${name} | Tempo: "${minTime}" | km: "${km}"`);

      const tresMinAtras = new Date(Date.now() - 3 * 60 * 1000);
      const jaExiste = await TempoVias.findOne({
        where: { viaId, leitura: { [Op.gte]: tresMinAtras } },
      });
      if (jaExiste) {
        console.log(`Dedup: leitura recente já existe para "${name}" (viaId ${viaId}), pulando.`);
        return;
      }

      await TempoVias.create({
        nomedarota: name,
        tempo: minTime.toString(),
        km: km.toString(),
        leitura: new Date(),
        viaId,
      });
      return;
    } catch (error) {
      if (attempt < 2) {
        console.log(`Tentando novamente: ${name}`);
        await new Promise(r => setTimeout(r, 2000 * attempt));
      } else {
        console.error(`Falha permanente: ${name} — ${error.message}`);
      }
    }
  }
}

// ─── Worker — pega rotas da fila compartilhada até ela esvaziar ───────────────
async function worker(browser, fila, id) {
  const page = await browser.newPage();

  // Bloqueia recursos visuais — Maps só precisa de JS e XHR para calcular tempo/km.
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'font', 'stylesheet', 'media', 'other'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

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
  const [[{ acquired }]] = await sequelize.query(
    `SELECT pg_try_advisory_lock(${ETL_LOCK_KEY}) AS acquired`
  );
  if (!acquired) {
    console.log('ETL: outro processo está rodando. Ciclo ignorado.');
    return;
  }

  let browser;
  try {
    const { data } = await axios.get('http://localhost:3001/rota/rotasvia');
    const fila = [...data.rotasvias];

    const inicio = Date.now();
    console.log(`Iniciando ciclo: ${fila.length} rotas em até ${CONCURRENCY} abas paralelas.${FAST_MODE ? ' [FAST MODE]' : ''}`);

    browser = await obterBrowser();
    ciclosBrowser++;

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
    // Se o browser crashou, força recriação no próximo ciclo
    if (browser && !browser.isConnected()) {
      console.log('ETL: browser desconectado — será recriado no próximo ciclo.');
      browserInstance = null;
      ciclosBrowser = MAX_CICLOS_BROWSER;
    }
  } finally {
    // Browser NÃO é fechado aqui — reutilizado no próximo ciclo (ver obterBrowser)
    await sequelize.query(`SELECT pg_advisory_unlock(${ETL_LOCK_KEY})`).catch(() => {});
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

(async () => {
  isRunning = true;
  try {
    await agendamentoDefinido();
  } finally {
    isRunning = false;
  }
})();
