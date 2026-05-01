const { Router } = require('express');
const nodemailer = require('nodemailer');
const TempoVias = require('../models/tempovias');
const { soAdmin } = require('../middlewares/auth');

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

// POST /api/health/test-email — admin only: dispara e-mail de teste imediatamente
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
