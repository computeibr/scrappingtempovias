const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { DateTime } = require('luxon');
const { eAdmin } = require('../middlewares/auth');
const TempoVias = require('../models/tempovias');
const Rotasvia = require('../models/rotasvia');
const DiasNaoUteis = require('../models/DiasNaoUteis');

const TZ = 'America/Sao_Paulo';
const toSP = (date) => DateTime.fromJSDate(new Date(date), { zone: TZ });

const extrairMinutos = (tempo) => {
  if (!tempo) return null;
  const hMatch = tempo.match(/(\d+)\s*h/);
  const mMatch = tempo.match(/(\d+)\s*min/);
  const horas = hMatch ? parseInt(hMatch[1]) : 0;
  const minutos = mMatch ? parseInt(mMatch[1]) : 0;
  const total = horas * 60 + minutos;
  return total > 0 ? total : null;
};

// GET /api/monitor
// Retorna todas as rotas com leitura atual e variação em relação à média histórica
// (últimas 3 semanas, mesma hora, mesmo dia da semana, excluindo dias não úteis)
router.get('/', eAdmin, async (req, res) => {
  try {
    const agora = DateTime.now().setZone(TZ);
    // Luxon weekday: 1=Seg...7=Dom → converter para JS 0=Dom...6=Sab
    const diaSemanaAtual = agora.weekday % 7;
    const tresSemanas = agora.minus({ days: 21 }).toJSDate();

    // Carrega dias não úteis do período para excluir da média
    const registrosDnu = await DiasNaoUteis.findAll({
      where: { data: { [Op.gte]: agora.minus({ days: 21 }).toISODate() } },
      attributes: ['data'],
    });
    const datasExcluidas = new Set(registrosDnu.map((d) => d.data));

    const rotas = await Rotasvia.findAll({ order: [['name', 'ASC']] });

    const resultado = await Promise.all(
      rotas.map(async (rota) => {
        // Leitura mais recente
        const ultima = await TempoVias.findOne({
          where: { viaId: rota.id },
          order: [['leitura', 'DESC']],
          attributes: ['tempo', 'km', 'leitura'],
        });

        if (!ultima) {
          return { id: rota.id, nome: rota.name, leituraAtual: null,
            mediaHistorica: null, variacao: null, status: 'sem_dados' };
        }

        const tempoAtualMin = extrairMinutos(ultima.tempo);
        const horaLeitura = toSP(ultima.leitura).hour;

        // Histórico das últimas 3 semanas para filtrar no JS
        const historico = await TempoVias.findAll({
          where: { viaId: rota.id, leitura: { [Op.gte]: tresSemanas } },
          attributes: ['tempo', 'leitura'],
        });

        // Filtra: mesma hora, mesmo dia da semana, excluindo não úteis
        const validos = historico
          .filter((r) => {
            const dt = toSP(r.leitura);
            return (
              dt.hour === horaLeitura &&
              dt.weekday % 7 === diaSemanaAtual &&
              !datasExcluidas.has(dt.toISODate())
            );
          })
          .map((r) => extrairMinutos(r.tempo))
          .filter((v) => v !== null);

        const media =
          validos.length > 0
            ? parseFloat((validos.reduce((s, v) => s + v, 0) / validos.length).toFixed(1))
            : null;

        let variacao = null;
        let status = 'sem_historico';

        if (media !== null && tempoAtualMin !== null) {
          variacao = parseFloat((((tempoAtualMin - media) / media) * 100).toFixed(1));
          if (variacao > 5) status = 'acima';
          else if (variacao < -5) status = 'abaixo';
          else status = 'normal';
        }

        return {
          id: rota.id,
          nome: rota.name,
          url: rota.url,
          leituraAtual: {
            tempo: ultima.tempo,
            tempoMinutos: tempoAtualMin,
            km: ultima.km,
            leitura: ultima.leitura,
          },
          mediaHistorica: media !== null ? { media, baseadoEm: validos.length } : null,
          variacao,
          status,
        };
      }),
    );

    return res.json({ rotas: resultado, atualizadoEm: new Date() });
  } catch (err) {
    return res.status(500).json({ erro: true, mensagem: err.message });
  }
});

module.exports = router;
