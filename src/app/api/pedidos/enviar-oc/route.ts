import { NextRequest, NextResponse } from 'next/server';
import { generateOCPDF } from '@/lib/pdf-generator';
import { sendEmailWithOC, sendWhatsAppSimulated } from '@/lib/send-service';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function supabaseGet(path: string) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
  });
  if (!res.ok) throw new Error('GET: ' + (await res.text()));
  const text = await res.text();
  if (!text) return [];
  return JSON.parse(text);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ordem_compra_id, email_fornecedor, numero_whatsapp } = body;

    if (!ordem_compra_id) {
      return NextResponse.json(
        { error: 'ordem_compra_id é obrigatório' },
        { status: 400 }
      );
    }

    // 1. Buscar dados da OC
    const ordens = await supabaseGet(`ordens_compra?id=eq.${ordem_compra_id}&select=*`);
    if (!ordens || ordens.length === 0) {
      return NextResponse.json({ error: 'Ordem de compra não encontrada' }, { status: 404 });
    }
    const oc = ordens[0];

    // 2. Buscar pedido para informações adicionais
    const pedidos = await supabaseGet(
      `pedidos_compra?id=eq.${oc.pedido_compra_id}&select=codigo`
    );
    const pedido = pedidos?.[0];

    // 3. Buscar itens da OC
    const itens = await supabaseGet(
      `itens_pedido_compra?pedido_compra_id=eq.${oc.pedido_compra_id}&select=descricao_padronizada,quantidade,unidade,preco_referencia_sinapi`
    );

    // 4. Buscar fornecedor
    let fornecedor: any = null;
    try {
      const fornecedores = await supabaseGet(
        `fornecedores?id=eq.${oc.fornecedor_id}&select=nome_fantasia,email,telefone`
      );
      fornecedor = fornecedores?.[0];
    } catch (e) {
      console.error('Erro ao buscar fornecedor:', e);
    }

    // 5. Preparar dados da OC para PDF
    const ocData = {
      id: oc.id,
      codigo: oc.codigo,
      pedido_codigo: pedido?.codigo || 'N/A',
      fornecedor: fornecedor?.nome_fantasia || 'Fornecedor',
      data_emissao: oc.data_emissao || new Date().toISOString(),
      valor_total: oc.valor_total || 0,
      itens: Array.isArray(itens)
        ? itens.map((item: any) => ({
            descricao: item.descricao_padronizada,
            quantidade: item.quantidade,
            unidade: item.unidade,
            preco_unitario: item.preco_referencia_sinapi,
            preco_total: (item.preco_referencia_sinapi || 0) * (item.quantidade || 0),
          }))
        : [],
    };

    // 6. Gerar PDF
    const pdfBuffer = await generateOCPDF(ocData);
    const pdfBase64 = pdfBuffer.toString('base64');

    // 7. Enviar por email
    let emailResultado = null;
    const emailDestino = email_fornecedor || fornecedor?.email;
    if (emailDestino && process.env.RESEND_API_KEY) {
      try {
        // Enviar email de forma assíncrona (sem bloquear)
        sendEmailWithOC(
          emailDestino,
          fornecedor?.nome_fantasia || 'Fornecedor',
          oc.codigo,
          pdfBuffer
        ).then(() => {
          console.log('Email enviado com sucesso para:', emailDestino);
        }).catch((err: any) => {
          console.error('Erro ao enviar email:', err.message);
        });
        
        emailResultado = { 
          status: 'enviando',
          para: emailDestino,
          mensagem: 'Email sendo enviado...'
        };
      } catch (err: any) {
        console.error('Erro ao iniciar envio de email:', err.message);
        emailResultado = { error: err.message };
      }
    } else if (!emailDestino) {
      emailResultado = { 
        info: 'Nenhum email configurado para o fornecedor'
      };
    } else {
      emailResultado = { 
        info: 'Email desabilitado - configure RESEND_API_KEY em .env.local'
      };
    }

    // 8. Enviar por WhatsApp
    let whatsappResultado = null;
    const numeroDestino = numero_whatsapp || fornecedor?.telefone;
    if (numeroDestino) {
      try {
        // Usando versão simulada para desenvolvimento
        whatsappResultado = await sendWhatsAppSimulated(
          numeroDestino,
          oc.codigo,
          pdfBase64
        );
        console.log('WhatsApp enviado com sucesso (simulado)');
      } catch (err: any) {
        console.error('Erro ao enviar WhatsApp:', err.message);
        whatsappResultado = { error: err.message };
      }
    }

    return NextResponse.json({
      etapa: 'oc_enviada',
      ordem_compra: {
        id: oc.id,
        codigo: oc.codigo,
        status: 'enviada',
      },
      envios: {
        email: emailResultado,
        whatsapp: whatsappResultado,
      },
      mensagem: 'Ordem de Compra gerada e enviada com sucesso',
    });
  } catch (err: any) {
    console.error('Erro ao enviar OC:', err);
    return NextResponse.json(
      { error: err.message || 'Erro ao enviar Ordem de Compra' },
      { status: 500 }
    );
  }
}
