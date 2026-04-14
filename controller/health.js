const { Router } = require('express');
const TempoVias = require('../models/tempovias');

const router = Router();

// GET /api/health — sem autenticação, para monitoramento externo
router.get('/', async (req, res) => {
  try {
    const ultima = await TempoVias.findOne({
      attributes: ['leitura'],
      order: [['leitura', 'DESC']],
    });

    const agora = new Date();
    const minutosDesde = ultima
      ? Math.floor((agora - new Date(ultima.leitura)) / 60000)
      : null;

    // Considera saudável se houver leitura nos últimos 15 min
    const ok = minutosDesde !== null && minutosDesde < 15;

    res.status(ok ? 200 : 503).json({
      ok,
      ultimaLeitura: ultima?.leitura || null,
      minutosDesdeUltimaLeitura: minutosDesde,
      etlAtivo: process.env.ETL_ENABLED === 'true',
      alertaEmailConfigurado: !!(process.env.ALERT_EMAIL && process.env.ALERT_EMAIL_PASS),
      servidor: agora.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

module.exports = router;
