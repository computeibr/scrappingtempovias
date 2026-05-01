const os = require('os');
const v8 = require('v8');
const { Router } = require('express');
const nodemailer = require('nodemailer');
const TempoVias = require('../models/tempovias');
const { soAdmin } = require('../middlewares/auth');

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatarUptime(segundos) {
  const d = Math.floor(segundos / 86400);
  const h = Math.floor((segundos % 86400) / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const partes = [];
  if (d > 0) partes.push(`${d}d`);
  if (h > 0) partes.push(`${h}h`);
  partes.push(`${m}min`);
  return partes.join(' ');
}

// ─── GET /api/health — público, para monitoramento externo ───────────────────
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

// ─── GET /api/health/detalhes — admin: métricas completas do sistema ─────────
router.get('/detalhes', soAdmin, async (req, res) => {
  try {
    const ultima = await TempoVias.findOne({
      attributes: ['leitura'],
      order: [['leitura', 'DESC']],
    });

    const agora = new Date();
    const minutosDesde = ultima
      ? Math.floor((agora - new Date(ultima.leitura)) / 60000)
      : null;
    const ok = minutosDesde !== null && minutosDesde < 15;

    const mem = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    const carga = os.loadavg();
    const uptimeProcesso = process.uptime();
    const uptimeSistema = os.uptime();

    return res.json({
      ok,
      etl: {
        ativo:                  process.env.ETL_ENABLED === 'true',
        fastMode:               process.env.ETL_FAST_MODE === 'true',
        concurrency:            parseInt(process.env.ETL_CONCURRENCY || '8', 10),
        tabDelay:               parseInt(process.env.ETL_TAB_DELAY || '500', 10),
        browserRecycle:         parseInt(process.env.ETL_BROWSER_RECYCLE || '12', 10),
        ultimaLeitura:          ultima?.leitura || null,
        minutosDesdeUltimaLeitura: minutosDesde,
      },
      email: {
        configurado:  !!(process.env.ALERT_EMAIL && process.env.ALERT_EMAIL_PASS),
        remetente:    process.env.ALERT_EMAIL || null,
        destinatario: process.env.ALERT_EMAIL_TO || process.env.ALERT_EMAIL || null,
      },
      sistema: {
        memoria: {
          heapUsado:     mem.heapUsed,
          heapTotal:     mem.heapTotal,
          heapLimite:    heapStats.heap_size_limit,
          rss:           mem.rss,
          sistemaTotal:  os.totalmem(),
          sistemaLivre:  os.freemem(),
        },
        carga: {
          um:     parseFloat(carga[0].toFixed(2)),
          cinco:  parseFloat(carga[1].toFixed(2)),
          quinze: parseFloat(carga[2].toFixed(2)),
          nucleos: os.cpus().length,
        },
        uptime: {
          processoSegundos: Math.floor(uptimeProcesso),
          sistemaSegundos:  Math.floor(uptimeSistema),
          processoFormatado: formatarUptime(uptimeProcesso),
          sistemaFormatado:  formatarUptime(uptimeSistema),
        },
        node:      process.version,
        plataforma: `${process.platform} (${os.arch()})`,
      },
      servidor: agora.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, erro: err.message });
  }
});

// ─── POST /api/health/test-email — admin: dispara e-mail de teste ────────────
router.post('/test-email', soAdmin, async (req, res) => {
  const { ALERT_EMAIL, ALERT_EMAIL_PASS, ALERT_EMAIL_TO } = process.env;

  if (!ALERT_EMAIL || !ALERT_EMAIL_PASS) {
    return res.status(400).json({
      ok: false,
      mensagem: 'ALERT_EMAIL ou ALERT_EMAIL_PASS não configurados nas variáveis de ambiente.',
    });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: ALERT_EMAIL, pass: ALERT_EMAIL_PASS },
  });

  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  try {
    await transporter.sendMail({
      from: `"Tempovias Monitor" <${ALERT_EMAIL}>`,
      to: ALERT_EMAIL_TO || ALERT_EMAIL,
      subject: '✅ Tempovias — Teste de e-mail funcionando',
      text: [
        'Este é um e-mail de teste enviado manualmente pelo painel de Saúde do Tempovias.',
        '',
        `Data/hora: ${agora}`,
        `Remetente: ${ALERT_EMAIL}`,
        `Destinatário: ${ALERT_EMAIL_TO || ALERT_EMAIL}`,
        '',
        'Se você recebeu este e-mail, a configuração de alertas está correta.',
      ].join('\n'),
    });

    return res.json({ ok: true, mensagem: `E-mail enviado para ${ALERT_EMAIL_TO || ALERT_EMAIL}.` });
  } catch (err) {
    return res.status(500).json({ ok: false, mensagem: err.message });
  }
});

module.exports = router;
