import { NextRequest, NextResponse } from 'next/server';
import { inicializarZApi } from '@/lib/z-api-whatsapp';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/whatsapp/enviar-cotacao
 * Enviar opções de cotação via WhatsApp usando Z-API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cotacao_id, telefone, nome_cliente, empresa_id } = body;

    if (!cotacao_id || !telefone) {
      return NextResponse.json(
        { erro: 'cotacao_id e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    console.log(`💰 Preparando envio de cotação ${cotacao_id} para ${telefone}`);

    // Buscar dados da cotação
    const { data: cotacao, error: cotacaoError } = await supabase
      .from('cotacoes')
      .select('*')
      .eq('id', cotacao_id)
      .single();

    if (cotacaoError || !cotacao) {
      console.error('Cotação não encontrada:', cotacaoError);
      return NextResponse.json(
        { erro: 'Cotação não encontrada' },
        { status: 404 }
      );
    }

    // Buscar opcoes da cotação
    const { data: opcoes, error: opcoesError } = await supabase
      .from('cotacao_opcoes')
      .select('*')
      .eq('cotacao_id', cotacao_id)
      .order('ordem', { ascending: true });

    if (opcoesError) {
      console.error('Erro ao buscar opções:', opcoesError);
    }

    // Montar mensagem com opções
    const mensagem = `
💰 *Cotação #${cotacao.numero_cotacao}*

*Cliente:* ${nome_cliente || cotacao.cliente}
*Descrição:* ${cotacao.descricao_item}
*Data:* ${new Date(cotacao.created_at).toLocaleDateString('pt-BR')}

*Opções de Fornecedores:*
${
  opcoes && opcoes.length > 0
    ? opcoes
        .map(
          (op: any, idx: number) =>
            `*Opção ${idx + 1}:* ${op.fornecedor_nome}
Preço: R$ ${op.valor?.toFixed(2) || '0,00'}
Prazo: ${op.prazo_dias || '?'} dias
${op.observacoes ? `Obs: ${op.observacoes}` : ''}`
        )
        .join('\n\n')
    : 'Sem opções disponíveis'
}

---
📲 *Para aceitar uma opção*, responda com o número dela.

Voima Engenharia
`;

    // Inicializar Z-API
    const zapi = inicializarZApi();

    // Enviar via Z-API
    const resultado = await zapi.enviarTexto(telefone, mensagem.trim());

    if (!resultado.success) {
      console.error('Erro ao enviar cotação:', resultado.error);
      return NextResponse.json(
        { erro: resultado.error || 'Erro ao enviar mensagem' },
        { status: 500 }
      );
    }

    // Registrar envio no banco
    try {
      const { error: registroError } = await supabase
        .from('whatsapp_mensagens')
        .insert({
          cotacao_id: cotacao_id,
          telefone: telefone,
          nome_contato: nome_cliente,
          mensagem: mensagem.trim(),
          tipo: 'saida',
          message_id: resultado.messageId,
          status_entrega: 'enviada',
          empresa_id: empresa_id,
          timestamp: new Date(),
        });

      if (registroError) {
        console.warn('Erro ao registrar envio:', registroError);
      }
    } catch (err) {
      console.error('Exception ao registrar:', err);
    }

    console.log(`✅ Cotação ${cotacao_id} enviada para ${telefone}`);

    return NextResponse.json({
      sucesso: true,
      message_id: resultado.messageId,
      telefone: telefone,
      cotacao_numero: cotacao.numero_cotacao,
      opcoes_count: opcoes?.length || 0,
    });
  } catch (erro: any) {
    console.error('❌ Erro geral:', erro);
    return NextResponse.json(
      { erro: erro.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
