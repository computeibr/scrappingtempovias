const axios = require('axios');

const CRM_API_URL     = process.env.CRM_API_URL;
const CRM_API_KEY     = process.env.CRM_API_KEY;
const CRM_WHATSAPP_ID = parseInt(process.env.CRM_WHATSAPP_ID || '0', 10);
const DESTINOS        = (process.env.ALERTA_WHATSAPP_PARA || '')
  .split(',').map(n => n.trim()).filter(Boolean);

// Envia para todos os números em ALERTA_WHATSAPP_PARA (vírgula-separados)
async function enviarAlertaWhatsapp(mensagem) {
  if (!CRM_API_URL || !CRM_API_KEY || !CRM_WHATSAPP_ID || DESTINOS.length === 0) {
    console.warn('[alertaWhatsapp] Variáveis não configuradas — alerta ignorado.');
    return;
  }

  for (const numero of DESTINOS) {
    try {
      await axios.post(
        `${CRM_API_URL}/whatsapp/mensagem/texto`,
        { id_whatsapp: CRM_WHATSAPP_ID, number: numero, text: mensagem },
        {
          headers: {
            Authorization: `Bearer ${CRM_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      console.log(`[alertaWhatsapp] Enviado para ${numero}.`);
    } catch (err) {
      console.error(`[alertaWhatsapp] Falha ao enviar para ${numero}:`, err.message);
    }
  }
}

module.exports = { enviarAlertaWhatsapp };
