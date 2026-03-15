import { NextRequest, NextResponse } from 'next/server';
import { inicializarEvolutionAPI } from '@/lib/evolution-whatsapp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
};

async function supabasePost(path: string, body: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path}: ${await res.text()}`);
  return res.json();
}

/**
 * POST /api/whatsapp/enviar-oc
 * Enviar Ordem de Compra via WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      numero_whatsapp,
      oc_codigo,
      fornecedor_nome,
      valor_total,
      pdf_url, // URL do PDF gerado
    } = body;

    if (!numero_whatsapp || !oc_codigo) {
      return NextResponse.json(
        { error: 'numero_whatsapp e oc_codigo são obrigatórios' },
        { status: 400 }
      );
    }

    // Inicializar cliente EvolutionAPI
    const evolution = inicializarEvolutionAPI();

    // 1. Mensagem inicial + PDF
    const mensagem = `
📋 *Ordem de Compra ${oc_codigo}*

Fornecedor: *${fornecedor_nome}*
Valor Total: *R$ ${valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*

Segue em anexo a Ordem de Compra completa em PDF.

Por favor, confirme o recebimento e entre em contato em caso de dúvidas.

Atenciosamente,
*VOIMA - Compras Inteligentes* 📦
    `.trim();

    // Enviar texto
    const envio_texto = await evolution.enviarTexto(numero_whatsapp, mensagem);

    // Enviar PDF se fornecido
    let envio_pdf = null;
    if (pdf_url) {
      envio_pdf = await evolution.enviarDocumento(
        numero_whatsapp,
        pdf_url,
        `OC-${oc_codigo}.pdf`
      );
    }

    // 2. Registrar tentativa no banco (para audit/log)
    await supabasePost('whatsapp_logs', {
      numero_destino: numero_whatsapp,
      tipo_mensagem: 'oc_enviada',
      oc_codigo,
      fornecedor_nome,
      message_id: envio_texto.messageId,
      status: 'enviada',
      resposta_evolution: {
        texto: envio_texto,
        pdf: envio_pdf,
      },
    }).catch(e => console.error('Erro ao registrar log:', e));

    return NextResponse.json({
      sucesso: true,
      oc_codigo,
      messageId: envio_texto.messageId,
      numero_destino: numero_whatsapp,
      mensagem: 'Ordem de Compra enviada via WhatsApp',
      pdf_enviado: !!envio_pdf,
    });
  } catch (err: any) {
    console.error('WHATSAPP OC ERROR:', err);
    return NextResponse.json(
      { error: err.message, detalhes: err.response?.data },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/enviar-cotacao
 * Enviar Cotação/Mapa de Cotação via WhatsApp
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      numero_whatsapp,
      pedido_codigo,
      cotacao_id,
      fornecedores_opcoes, // Array de { nome, preco }
    } = body;

    if (!numero_whatsapp || !pedido_codigo) {
      return NextResponse.json(
        { error: 'numero_whatsapp e pedido_codigo são obrigatórios' },
        { status: 400 }
      );
    }

    const evolution = inicializarEvolutionAPI();

    // Montar mensagem com opções de fornecedores
    let mensagem_opcoes = `
🏭 *Cotação ${pedido_codigo} - Opções de Fornecedores*

Recebemos respostas dos seguintes fornecedores:

    `.trim();

    fornecedores_opcoes?.forEach((f: any, idx: number) => {
      mensagem_opcoes += `\n\n${idx + 1}️⃣ *${f.nome}*\n   R$ ${f.preco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    });

    mensagem_opcoes += `\n\n✅ Responda com o número do fornecedor escolhido.`;

    const envio = await evolution.enviarTexto(numero_whatsapp, mensagem_opcoes);

    // Registrar
    await supabasePost('whatsapp_logs', {
      numero_destino: numero_whatsapp,
      tipo_mensagem: 'cotacao_opcoes',
      pedido_codigo,
      message_id: envio.messageId,
      status: 'enviada',
    }).catch(e => console.error('Erro ao registrar log:', e));

    return NextResponse.json({
      sucesso: true,
      pedido_codigo,
      messageId: envio.messageId,
      opcoes_enviadas: fornecedores_opcoes?.length || 0,
    });
  } catch (err: any) {
    console.error('WHATSAPP COTACAO ERROR:', err);
    return NextResponse.json(
      { error: err.message, detalhes: err.response?.data },
      { status: 500 }
    );
  }
}

/**
 * GET /api/whatsapp/status/{messageId}
 * Verificar status de uma mensagem
 */
export async function GET(request: NextRequest, { params }: any) {
  try {
    const messageId = params?.messageId;

    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId obrigatório' },
        { status: 400 }
      );
    }

    const evolution = inicializarEvolutionAPI();
    const status = await evolution.obterStatusMensagem(messageId);

    return NextResponse.json({
      messageId,
      status: status.status,
      timestamp: status.timestamp,
    });
  } catch (err: any) {
    console.error('WHATSAPP STATUS ERROR:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
