import { Resend } from 'resend';
import axios from 'axios';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmailWithOC(
  destinatario: string,
  nomeDestino: string,
  ocCodigo: string,
  pdfBuffer: Buffer
) {
  const { data, error } = await resend.emails.send({
    from: 'VOIMA Compras <onboarding@resend.dev>',
    to: destinatario,
    subject: `Ordem de Compra ${ocCodigo} - VOIMA`,
    html: `
      <h2>Olá ${nomeDestino},</h2>
      <p>Segue em anexo a Ordem de Compra <strong>${ocCodigo}</strong>.</p>
      <p>Por favor, confira os dados e entre em contato em caso de dúvidas.</p>
      <p>Atenciosamente,<br/>VOIMA - Sistema de Compras</p>
    `,
    attachments: [
      {
        filename: `${ocCodigo}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    console.error('Erro ao enviar email (Resend):', error);
    throw new Error(`Erro ao enviar email: ${error.message}`);
  }

  console.log('Email enviado (Resend):', data?.id);
  return { sucesso: true, messageId: data?.id };
}

export async function sendWhatsAppWithOC(
  numeroWhatsApp: string,
  ocCodigo: string,
  pdfBase64: string
) {
  try {
    // Usando Evolution API ou similar (adapte conforme sua infraestrutura)
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    const instanceId = process.env.WHATSAPP_INSTANCE_ID;

    if (!apiUrl || !apiToken || !instanceId) {
      throw new Error('Configurações de WhatsApp não definidas');
    }

    // Primeiro: enviar mensagem de texto
    const respostaTexto = await axios.post(
      `${apiUrl}/message/sendText/${instanceId}`,
      {
        number: numeroWhatsApp,
        text: `Olá! Segue a Ordem de Compra *${ocCodigo}* em anexo. Por favor, confira os dados.`,
      },
      { headers: { apikey: apiToken } }
    );

    // Segundo: enviar PDF
    const respostaPDF = await axios.post(
      `${apiUrl}/message/sendMedia/${instanceId}`,
      {
        number: numeroWhatsApp,
        mediatype: 'document',
        media: `data:application/pdf;base64,${pdfBase64}`,
        caption: `OC - ${ocCodigo}`,
      },
      { headers: { apikey: apiToken } }
    );

    console.log('WhatsApp enviado:', respostaTexto.data);
    return { sucesso: true, data: respostaPDF.data };
  } catch (erro) {
    console.error('Erro ao enviar WhatsApp:', erro);
    throw new Error(`Erro ao enviar WhatsApp: ${(erro as any).message}`);
  }
}

// Versão simulada do WhatsApp para desenvolvimento (sem API real)
export async function sendWhatsAppSimulated(
  numeroWhatsApp: string,
  ocCodigo: string,
  pdfBase64: string
) {
  console.log(`[SIMULADO] WhatsApp enviado para ${numeroWhatsApp}`);
  console.log(`[SIMULADO] OC: ${ocCodigo}`);
  console.log(`[SIMULADO] PDF: ${pdfBase64.substring(0, 50)}...`);
  
  return {
    sucesso: true,
    simulado: true,
    mensgem: `Mensagem de WhatsApp simulada para ${numeroWhatsApp}`,
  };
}
