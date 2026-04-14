require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');

async function testar() {
  const { ALERT_EMAIL, ALERT_EMAIL_PASS, ALERT_EMAIL_TO } = process.env;

  if (!ALERT_EMAIL || !ALERT_EMAIL_PASS) {
    console.error('ALERT_EMAIL ou ALERT_EMAIL_PASS não configurados no .env');
    process.exit(1);
  }

  const para = ALERT_EMAIL_TO || ALERT_EMAIL;
  console.log(`Enviando e-mail de teste de ${ALERT_EMAIL} para ${para}...`);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: ALERT_EMAIL, pass: ALERT_EMAIL_PASS },
  });

  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  await transporter.sendMail({
    from: `"Tempovias Monitor" <${ALERT_EMAIL}>`,
    to: para,
    subject: '✅ Tempovias — Teste de alerta',
    text: [
      'Este é um e-mail de teste do sistema de alertas do Tempovias.',
      '',
      `Data/hora: ${agora}`,
      '',
      'Se você recebeu este e-mail, o sistema de alertas está funcionando corretamente.',
      'Em caso de falha no scraping (3 ciclos consecutivos), você receberá um e-mail automático.',
    ].join('\n'),
  });

  console.log('✅ E-mail enviado com sucesso!');
}

testar().catch((err) => {
  console.error('❌ Falha ao enviar:', err.message);
  process.exit(1);
});
