import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { empresa_id, telefone_cliente, mensagem } = await request.json();

    if (!empresa_id || !mensagem) {
      return NextResponse.json(
        { error: 'empresa_id e mensagem são obrigatórios' },
        { status: 400 }
      );
    }

    console.log(`🤖 Agent processando para empresa:`, empresa_id);

    const { data: empresaData } = await (supabase
      .from('empresas')
      .select('razao_social, nome_fantasia, cnpj, email, telefone')
      .eq('id', empresa_id)
      .single() as any);

    if (!empresaData) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    const { data: historico } = await (supabase
      .from('whatsapp_mensagens')
      .select('mensagem, tipo, timestamp')
      .eq('empresa_id', empresa_id)
      .eq('telefone_cliente', telefone_cliente)
      .order('timestamp', { ascending: false })
      .limit(10) as any);

    const conversaAnterior = historico
      ?.reverse()
      .map(
        (msg: any) =>
          `${msg.tipo === 'entrada' ? 'Cliente' : 'Você'}: ${msg.mensagem}`
      )
      .join('\n');

    const systemPrompt = `Você é assistente de atendimento para ${empresaData.razao_social}.
${empresaData.nome_fantasia ? `Nome fantasia: ${empresaData.nome_fantasia}` : ''}
CNPJ: ${empresaData.cnpj || 'N/A'}

Responda com profissionalismo, brevidade (2-3 linhas), em Português do Brasil.`;

    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${conversaAnterior ? `Contexto:\n${conversaAnterior}\n\n` : ''}Cliente: ${mensagem}\n\nResponda:`,
        },
      ],
    });

    const resposta =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // @ts-ignore - Supabase types issue
    await supabase.from('whatsapp_mensagens').insert({
      empresa_id,
      telefone_cliente,
      mensagem: resposta,
      tipo: 'saida',
      timestamp: new Date().toISOString(),
      metadata: { processado_por: 'agent', modelo: 'claude-3-5-haiku' },
    });

    const custo =
      (response.usage.input_tokens * 0.000004 +
        response.usage.output_tokens * 0.000020) /
      1000;

    // @ts-ignore - Supabase types issue
    await supabase.from('lancamentos_financeiros').insert({
      empresa_id,
      tipo: 'credito',
      descricao: `Claude WhatsApp`,
      valor: -custo,
      categoria: 'api_usage',
      status: 'confirmado',
    });

    return NextResponse.json({
      success: true,
      resposta,
      metadata: {
        empresa_id,
        tokens_output: response.usage.output_tokens,
        custo: custo,
      },
    });
  } catch (error) {
    console.error('❌ Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro processando' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'agent_ativo' });
}
