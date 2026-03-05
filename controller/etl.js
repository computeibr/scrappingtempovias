require('dotenv').config();
const axios = require('axios');
const sequelize = require("sequelize");
const cron = require('node-cron');
const { Op } = require("sequelize");
const puppeteer = require('puppeteer');
const { stringify } = require('querystring');
const TempoVias = require('../models/tempovias');
const Rotasvia = require('../models/rotasvia');
const fs = require('fs');

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

      // Seleciona o tempo de viagem: padrão "X min" ou "X h X min" (texto curto, evita pegar outros modos)
      const minElement = await page.$x("//div[contains(text(), ' min') and string-length(normalize-space(text())) < 15]");
      const minTime = await page.evaluate(element => element.textContent.trim(), minElement[0]);

      const kmElement = await page.$x("//div[contains(text(), 'km')]");
      const km = await page.evaluate(element => element.textContent.trim(), kmElement[0]);
      // Insere os dados obtidos no banco de dados usando o Sequelize
      await TempoVias.create({
        nomedarota: name,
        tempo: minTime.toString(),
        km: km.toString(),
        leitura: new Date(),
        viaId: viaId
      });



      console.log(`Id:  ${viaId} Nome: ${name}`)
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
    
    console.log("--------------------------------------Processamento das rotas concluído com sucesso.----------------------------------------");

  } catch (error) {
    console.error("Erro ao obter rotas ou processar URLs:", error);
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
