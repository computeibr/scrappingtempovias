const { Op } = require('sequelize');
const { DateTime } = require('luxon');
const TempoVias = require('../models/tempovias');
const DiasNaoUteis = require('../models/DiasNaoUteis');
const { enviarAlertaWhatsapp } = require('./alertaWhatsapp');

const TZ = 'America/Sao_Paulo';

// Configuráveis via .env
const LIMIAR       = parseFloat(process.env.ALERTA_VARIACAO_PORCENTO || '20');
const COOLDOWN_MIN = parseInt(process.env.ALERTA_VARIACAO_COOLDOWN   || '60', 10);
const MIN_HISTORICO = 3; // mínimo de leituras históricas para calcular média

// Cooldown em memória: evita spam por rota (reset ao reiniciar o processo)
const ultimosAlertas = new Map(); // viaId → Date.now()

function extrairMinutos(tempo) {
  if (!tempo) return null;
  const hMatch = tempo.match(/(\d+)\s*h/);
  const mMatch = tempo.match(/(\d+)\s*min/);
  const h = hMatch ? parseInt(hMatch[1]) : 0;
  const m = mMatch ? parseInt(mMatch[1]) : 0;
  const total = h * 60 + m;
  return total > 0 ? total : null;
}

async function verificarVariacao(viaId, nomeDaRota, tempo, urlRota) {
  // Só executa se WhatsApp estiver configurado
  if (!process.env.ALERTA_WHATSAPP_PARA) return;

  const minAtual = extrairMinutos(tempo);
  if (minAtual === null) return;

  // Cooldown: não reabre alerta para a mesma rota antes do tempo
  const ultimo = ultimosAlertas.get(viaId);
  if (ultimo && (Date.now() - ultimo) / 60000 < COOLDOWN_MIN) return;

  const agora           = DateTime.now().setZone(TZ);
  const horaAtual       = agora.hour;
  const diaSemanaAtual  = agora.weekday % 7; // Luxon 1=Seg..7=Dom → JS 0=Dom..6=Sab
  const tresSemanasAtras = agora.minus({ days: 21 }).toJSDate();

  // Carrega dias não úteis para exclusão da média
  const dnu = await DiasNaoUteis.findAll({
    where: { data: { [Op.gte]: agora.minus({ days: 21 }).toISODate() } },
    attributes: ['data'],
  }).catch(() => []);
  const datasExcluidas = new Set(dnu.map(d => d.data));

  // Leituras históricas das últimas 3 semanas para esta rota
  const historico = await TempoVias.findAll({
    where: { viaId, leitura: { [Op.gte]: tresSemanasAtras } },
    attributes: ['tempo', 'leitura'],
  }).catch(() => []);

  // Filtra: mesma hora, mesmo dia da semana, excluindo não úteis
  const validos = historico
    .filter(r => {
      const dt = DateTime.fromJSDate(new Date(r.leitura), { zone: TZ });
      return (
        dt.hour === horaAtual &&
        dt.weekday % 7 === diaSemanaAtual &&
        !datasExcluidas.has(dt.toISODate())
      );
    })
    .map(r => extrairMinutos(r.tempo))
    .filter(v => v !== null);

  if (validos.length < MIN_HISTORICO) return; // histórico insuficiente para comparação confiável

  const media    = validos.reduce((s, v) => s + v, 0) / validos.length;
  const variacao = ((minAtual - media) / media) * 100;

  if (variacao <= LIMIAR) return; // dentro do limite aceitável

  // Registra cooldown antes de enviar (evita disparos duplos em corrida)
  ultimosAlertas.set(viaId, Date.now());

  const DIAS     = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const diaNome  = DIAS[diaSemanaAtual];
  const horaTexto = String(horaAtual).padStart(2, '0') + 'h';

  const mensagem = [
    `🚨 *Alerta de Trânsito — Tempovias*`,
    ``,
    `*Rota:* ${nomeDaRota}`,
    `*Tempo atual:* ${tempo}`,
    `*Variação:* +${variacao.toFixed(1)}% acima da média histórica`,
    `*Referência (${diaNome} · ${horaTexto} · 3 sem.):* ${media.toFixed(0)} min`,
    ...(urlRota ? [``, `🗺️ ${urlRota}`] : []),
    ``,
    `_${agora.toFormat('dd/MM/yyyy HH:mm')} · America/Sao_Paulo_`,
  ].join('\n');

  console.log(`[alertaVariacao] Rota "${nomeDaRota}" com +${variacao.toFixed(1)}% — disparando WhatsApp.`);

  await enviarAlertaWhatsapp(mensagem).catch(err =>
    console.error(`[alertaVariacao] Erro ao enviar WhatsApp (rota ${viaId}):`, err.message)
  );
}

module.exports = { verificarVariacao };
