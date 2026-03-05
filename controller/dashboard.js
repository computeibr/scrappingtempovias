require('dotenv').config();
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { DateTime } = require('luxon');
const { eAdmin } = require('../middlewares/auth');
const TempoVias = require('../models/tempovias');
const Rotasvia = require('../models/rotasvia');

const TZ = 'America/Sao_Paulo';
const toSP = (date) => DateTime.fromJSDate(new Date(date), { zone: TZ });

// Extrai minutos de strings como "23 min", "1 h 10 min", "1h 5min"
const extrairMinutos = (tempo) => {
  if (!tempo) return null;
  const hMatch = tempo.match(/(\d+)\s*h/);
  const mMatch = tempo.match(/(\d+)\s*min/);
  const horas = hMatch ? parseInt(hMatch[1]) : 0;
  const minutos = mMatch ? parseInt(mMatch[1]) : 0;
  const total = horas * 60 + minutos;
  return total > 0 ? total : null;
};

// GET /api/dashboard/resumo
router.get('/resumo', eAdmin, async (req, res) => {
  try {
    const totalRotas = await Rotasvia.count();
    const totalLeituras = await TempoVias.count();
    const hoje = DateTime.now().setZone(TZ).startOf('day').toJSDate();
    const leiturasHoje = await TempoVias.count({ where: { leitura: { [Op.gte]: hoje } } });
    const semana = DateTime.now().setZone(TZ).minus({ days: 7 }).toJSDate();
    const leiturasSemana = await TempoVias.count({ where: { leitura: { [Op.gte]: semana } } });

    return res.json({ totalRotas, totalLeituras, leiturasHoje, leiturasSemana });
  } catch (err) {
    return res.status(500).json({ erro: true, mensagem: err.message });
  }
});

// GET /api/dashboard/rotas
router.get('/rotas', eAdmin, async (req, res) => {
  try {
    const rotas = await Rotasvia.findAll({ order: [['id', 'ASC']] });
    return res.json({ rotas });
  } catch (err) {
    return res.status(500).json({ erro: true, mensagem: err.message });
  }
});

// GET /api/dashboard/historico/:id?dataInicio=&dataFim=&diasSemana=
router.get('/historico/:id', eAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { dataInicio, dataFim, diasSemana } = req.query;

    const where = { viaId: id };

    if (dataInicio && dataFim) {
      where.leitura = {
        [Op.between]: [
          DateTime.fromISO(dataInicio, { zone: TZ }).startOf('day').toJSDate(),
          DateTime.fromISO(dataFim, { zone: TZ }).endOf('day').toJSDate(),
        ],
      };
    } else {
      // padrão: últimos 30 dias
      where.leitura = { [Op.gte]: DateTime.now().setZone(TZ).minus({ days: 30 }).toJSDate() };
    }

    const registros = await TempoVias.findAll({ where, order: [['leitura', 'ASC']] });

    // Filtrar por dia da semana se informado (0=Dom, 1=Seg... 6=Sab)
    const diasFiltro = diasSemana
      ? diasSemana.split(',').map(Number)
      : null;

    // luxon weekday: 1=Mon...7=Sun; convert to moment/JS convention: 0=Sun...6=Sat
    const filtrados = diasFiltro
      ? registros.filter((r) => diasFiltro.includes(toSP(r.leitura).weekday % 7))
      : registros;

    // Agregação por hora
    const porHora = Array.from({ length: 24 }, (_, h) => ({
      hora: h,
      label: `${String(h).padStart(2, '0')}:00`,
      total: 0,
      count: 0,
      min: Infinity,
      max: -Infinity,
    }));

    filtrados.forEach((r) => {
      const hora = toSP(r.leitura).hour;
      const min = extrairMinutos(r.tempo);
      if (min !== null) {
        porHora[hora].total += min;
        porHora[hora].count++;
        if (min < porHora[hora].min) porHora[hora].min = min;
        if (min > porHora[hora].max) porHora[hora].max = min;
      }
    });

    const mediasPorHora = porHora.map((h) => ({
      hora: h.hora,
      label: h.label,
      media: h.count > 0 ? parseFloat((h.total / h.count).toFixed(1)) : null,
      min: h.count > 0 ? parseFloat(h.min.toFixed(1)) : null,
      max: h.count > 0 ? parseFloat(h.max.toFixed(1)) : null,
      leituras: h.count,
    }));

    // Evolução diária (últimos registros agrupados por dia)
    const porDia = {};
    filtrados.forEach((r) => {
      const dia = toSP(r.leitura).toISODate();
      const min = extrairMinutos(r.tempo);
      if (min !== null) {
        if (!porDia[dia]) porDia[dia] = { total: 0, count: 0 };
        porDia[dia].total += min;
        porDia[dia].count++;
      }
    });

    const evolucaoDiaria = Object.entries(porDia)
      .map(([dia, d]) => ({
        dia,
        media: parseFloat((d.total / d.count).toFixed(1)),
        leituras: d.count,
      }))
      .sort((a, b) => a.dia.localeCompare(b.dia));

    return res.json({
      mediasPorHora,
      evolucaoDiaria,
      totalRegistros: filtrados.length,
    });
  } catch (err) {
    return res.status(500).json({ erro: true, mensagem: err.message });
  }
});

// GET /api/dashboard/snapshot - última leitura de cada rota (para popup no mapa)
router.get('/snapshot', eAdmin, async (req, res) => {
  try {
    const rotas = await Rotasvia.findAll({ attributes: ['id'], order: [['id', 'ASC']] });
    const snapshot = {};
    await Promise.all(
      rotas.map(async (r) => {
        const last = await TempoVias.findOne({
          where: { viaId: r.id },
          order: [['leitura', 'DESC']],
          attributes: ['tempo', 'km', 'leitura'],
        });
        if (last) snapshot[r.id] = last;
      }),
    );
    return res.json({ snapshot });
  } catch (err) {
    return res.status(500).json({ erro: true, mensagem: err.message });
  }
});

// GET /api/dashboard/ultimas/:id?page=1&limite=20&dataInicio=ISO&dataFim=ISO
router.get('/ultimas/:id', eAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limite = Math.min(100, parseInt(req.query.limite) || 20);
    const offset = (page - 1) * limite;
    const { dataInicio, dataFim } = req.query;

    const where = { viaId: id };
    if (dataInicio && dataFim) {
      where.leitura = { [Op.between]: [new Date(dataInicio), new Date(dataFim)] };
    } else if (dataInicio) {
      where.leitura = { [Op.gte]: new Date(dataInicio) };
    } else if (dataFim) {
      where.leitura = { [Op.lte]: new Date(dataFim) };
    }

    const { count, rows } = await TempoVias.findAndCountAll({
      where,
      order: [['leitura', 'DESC']],
      limit: limite,
      offset,
    });

    return res.json({
      registros: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limite),
    });
  } catch (err) {
    return res.status(500).json({ erro: true, mensagem: err.message });
  }
});

module.exports = router;
