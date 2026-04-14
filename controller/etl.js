require('dotenv').config();
const axios = require('axios');
const sequelize = require("sequelize");
const cron = require('node-cron');
const { Op } = require("sequelize");
const puppeteer = require('puppeteer');
const { stringify } = require('querystring');
const nodemailer = require('nodemailer');
const TempoVias = require('../models/tempovias');
const Rotasvia = require('../models/rotasvia');
const fs = require('fs');

// ─── Controle de alertas ─────────────────────────────────────────────────────
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

// Função para obter o tempo de viagem de uma determinada rota
const getTempoVias = async (page, url, name, viaId) => {
  const maxRetries = 2;
  // Garante modo carro (driving) na URL
  const urlFinal = url.includes('travelmode=') ? url : url + (url.includes('?') ? '&' : '?') + 'travelmode=driving';
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
//      console.log(`Tentativa ${attempt} para navegar até a Rota: ${name}`);
      await page.goto(urlFinal, { waitUntil: 'networkidle2', timeout: 60000 }); // Aumenta o timeout para 60 segundos

      await page.waitForXPath("//div[contains(text(), 'min') or contains(text(), 'h')]", { timeout: 60000 });
      await page.waitForXPath("//div[contains(text(), 'km')]", { timeout: 60000 });

      // Seleciona o tempo: exclui texto dentro de <button> (tabs de modo moto/bicicleta/ônibus)
      // Prioriza elementos de div que não são filhos de botão e têm texto curto tipo "23 min" ou "1 h 10 min"
      const minElement = await page.$x(
        "//div[not(ancestor::button) and not(ancestor::li[contains(@class,'modes')]) " +
        "and (contains(text(),' min') or (contains(text(),' h ') and contains(text(),'min'))) " +
        "and string-length(normalize-space(text())) < 20]"
      );
      const minTime = await page.evaluate(element => element.textContent.trim(), minElement[0]);

      const kmElement = await page.$x(
        "//div[not(ancestor::button) and contains(text(),' km') and string-length(normalize-space(text())) < 15]"
      );
      const km = await page.evaluate(element => element.textContent.trim(), kmElement[0]);

      console.log(`Id: ${viaId} | Nome: ${name} | Tempo capturado: "${minTime}" | km: "${km}"`);

      // Insere os dados obtidos no banco de dados usando o Sequelize
      await TempoVias.create({
        nomedarota: name,
        tempo: minTime.toString(),
        km: km.toString(),
        leitura: new Date(),
        viaId: viaId
      });
      break; // Sai do loop de re-tentativas em caso de sucesso
    } catch (error) {
      console.error(`Erro ao processar a URL ${name} na tentativa ${attempt}:`, error);
      if (attempt === maxRetries) {
        console.error(`Falha permanente ao processar a URL ${name} após ${maxRetries} tentativas.`);
      } else {
        console.log(`Tentando novamente...`);
      }
    }
  }
};
sequelize.cls
// Função para executar o agendamento definido
const agendamentoDefinido = async () => {
  let browser;
  try {
    const vias = await axios.get('http://localhost:3001/rota/rotasvia');

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
    const page = await browser.newPage();

    for (const rota of vias.data.rotasvias) {
      await getTempoVias(page, rota.url, rota.name, rota.id);
    }

    falhasConsecutivas = 0;
    alertaJaEnviado = false;
    console.log('Processamento das rotas concluído com sucesso.');

  } catch (error) {
    falhasConsecutivas++;
    console.error(`Erro ao obter rotas ou processar URLs (falha ${falhasConsecutivas}):`, error.message);
    if (falhasConsecutivas >= 3) {
      await enviarAlertaEmail(error.message || String(error));
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Agendamento de uma tarefa cron para ser executada a cada 5 minutos
let isRunning = false; // Flag para controlar o estado da execução

cron.schedule('*/5 * * * *', async () => {
  if (isRunning) {
    console.log('O cron ainda está em execução. Ignorando nova execução.');
    return;
  }

  isRunning = true; // Define como em execução

  try {
    await agendamentoDefinido(); // Sua função assíncrona
    console.log('Agendamento concluído com sucesso.');
  } catch (error) {
    console.error("Erro ao executar o agendamento:", error);
  } finally {
    isRunning = false; // Libera o flag ao final da execução
  }
}, null, true, 'America/Sao_Paulo');

// Chama a função de agendamento para executar o código imediatamente
agendamentoDefinido();
