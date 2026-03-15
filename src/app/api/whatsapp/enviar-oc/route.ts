import { NextRequest, NextResponse } from 'next/server';
import { inicializarZApi } from '@/lib/z-api-whatsapp';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/whatsapp/enviar-oc
 * Enviar Ordem de Compra via WhatsApp usando Z-API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oc_id, telefone, nome_cliente, empresa_id } = body;

    if (!oc_id || !telefone) {
      return NextResponse.json(
        { erro: 'oc_id e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    console.log(`📦 Preparando envio de OC ${oc_id} para ${telefone}`);

    // Buscar dados da OC no banco
    const ocResult = await (supabase as any)
      .from('ordens')
      .select('*')
      .eq('id', oc_id)
      .single();

    const oc = (ocResult?.data || null) as any;
    const ocError = ocResult?.error;

    if (ocError || !oc) {
      console.error('OC não encontrada:', ocError);
      return NextResponse.json(
        { erro: 'OC não encontrada' },
        { status: 404 }
      );
    }

    // Montar mensagem formatada
    const mensagem = `
📋 *Ordem de Compra #${oc.numero_oc}*

*Cliente:* ${nome_cliente || oc.cliente}
*Data:* ${new Date(oc.created_at).toLocaleDateString('pt-BR')}

*Itens:*
${
  oc.itens
    ?.map(
      (item: any) =>
        `• ${item.quantidade}x ${item.descricao_item} - R$ ${item.valor_unitario}`
    )
    .join('\n') || 'Sem itens'
}

*Total:* R$ ${oc.valor_total?.toFixed(2) || '0,00'}

📎 *Documentos:*
Clique no link abaixo para visualizar a OC completa:
[Visualizar OC]

---
Voima Engenharia
`;

    // Inicializar Z-API
    const zapi = inicializarZApi();

    // Enviar via Z-API
    const resultado = await zapi.enviarTexto(telefone, mensagem.trim());

    if (!resultado.success) {
      console.error('Erro ao enviar OC:', resultado.error);
      return NextResponse.json(
        { erro: resultado.error || 'Erro ao enviar mensagem' },
        { status: 500 }
      );
    }

    // Registrar envio no banco
    try {
      const mensagemObj = {
        oc_id: oc_id,
        telefone: telefone,
        nome_contato: nome_cliente,
        mensagem: mensagem.trim(),
        tipo: 'saida',
        message_id: resultado.messageId,
        status_entrega: 'enviada',
        empresa_id: empresa_id,
        timestamp: new Date(),
      } as any;

      const { error: registroError } = await (supabase as any)
        .from('whatsapp_mensagens')
        .insert(mensagemObj);

      if (registroError) {
        console.warn('Erro ao registrar envio:', registroError);
      }
    } catch (err) {
      console.error('Exception ao registrar:', err);
    }

    console.log(`✅ OC ${oc_id} enviada para ${telefone}`);

    return NextResponse.json({
      sucesso: true,
      message_id: resultado.messageId,
      telefone: telefone,
      oc_numero: oc.numero_oc,
    });
  } catch (erro: any) {
    console.error('❌ Erro geral:', erro);
    return NextResponse.json(
      { erro: erro.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
