const os = require('os');
const nodemailer = require('nodemailer');

// Threshold configurável — padrão 80% para não alertar nos picos normais do ETL (~70%).
// Ajuste com ALERTA_CPU_PORCENTO=50 se quiser alertas mais sensíveis.
const THRESHOLD = parseFloat(process.env.ALERTA_CPU_PORCENTO || '80') / 100;

// Intervalo de verificação (ms) e cooldown entre alertas (ms)
const INTERVALO_MS  = 60 * 1000;       // verifica a cada 1 min
const COOLDOWN_MS   = 30 * 60 * 1000;  // não reenvia por 30 min após um alerta

let estadoAlto       = false; // true quando CPU está acima do threshold
let ultimoAlertaEm   = null;

async function enviarAlertaCpu(pct, load1, nucleos) {
  if (!process.env.ALERT_EMAIL || !process.env.ALERT_EMAIL_PASS) {
    console.warn(`MonitorCPU: carga alta (${(pct * 100).toFixed(0)}%) mas e-mail não configurado.`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.ALERT_EMAIL, pass: process.env.ALERT_EMAIL_PASS },
  });

  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  try {
    await transporter.sendMail({
      from: `"Tempovias Monitor" <${process.env.ALERT_EMAIL}>`,
      to: process.env.ALERT_EMAIL_TO || process.env.ALERT_EMAIL,
      subject: `⚠️ Tempovias — CPU da VPS acima de ${Math.round(THRESHOLD * 100)}%`,
      text: [
        'Alerta automático de uso de CPU do Tempovias.',
        '',
        `Data/hora: ${agora}`,
        `Load average (1 min): ${load1.toFixed(2)}`,
        `Núcleos: ${nucleos}`,
        `Utilização: ${(pct * 100).toFixed(1)}% da capacidade total`,
        '',
        `Limite configurado: ${Math.round(THRESHOLD * 100)}% (ALERTA_CPU_PORCENTO)`,
        '',
        'Verifique os logs e o painel Saúde do Sistema no EasyPanel.',
      ].join('\n'),
    });
    console.log(`MonitorCPU: alerta enviado — CPU em ${(pct * 100).toFixed(1)}%.`);
  } catch (err) {
    console.error('MonitorCPU: falha ao enviar alerta de CPU:', err.message);
  }
}

async function verificar() {
  const load1   = os.loadavg()[0];
  const nucleos = os.cpus().length;
  const pct     = load1 / nucleos;
  const agora   = Date.now();

  const emCooldown = ultimoAlertaEm && (agora - ultimoAlertaEm) < COOLDOWN_MS;

  if (pct > THRESHOLD) {
    if (!estadoAlto && !emCooldown) {
      // Transição normal → alto: envia alerta
      estadoAlto     = true;
      ultimoAlertaEm = agora;
      console.warn(`MonitorCPU: CPU em ${(pct * 100).toFixed(1)}% — enviando alerta.`);
      await enviarAlertaCpu(pct, load1, nucleos).catch(() => {});
    }
  } else {
    // CPU voltou ao normal: libera para novo alerta quando subir de novo
    if (estadoAlto) {
      console.log(`MonitorCPU: CPU voltou ao normal (${(pct * 100).toFixed(1)}%).`);
    }
    estadoAlto = false;
  }
}

function iniciar() {
  const limiteStr = `${Math.round(THRESHOLD * 100)}%`;
  console.log(`MonitorCPU ativo — alerta se carga > ${limiteStr} (verifica a cada 1 min).`);
  setInterval(verificar, INTERVALO_MS);
  // Primeira verificação após 1 min para dar tempo do sistema estabilizar
}

module.exports = { iniciar };
