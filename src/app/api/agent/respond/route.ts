import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

/**
 * POST /api/agent/respond
 * 
 * Processa uma mensagem WhatsApp com Claude e retorna resposta
 * 
 * Esperado:
 * {
 *   empresa_id: "uuid",
 *   telefone_cliente: "55...",
 *   mensagem: "texto da mensagem"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { empresa_id, telefone_cliente, mensagem } = await request.json();

    if (!empresa_id || !mensagem) {
      return NextResponse.json(
        { error: 'empresa_id e mensagem são obrigatórios' },
        { status: 400 }
      );
    }

    console.log(`🤖 Agent processando:`, { empresa_id, telefone_cliente, mensagem });

    // ========================================
    // 1. Buscar contexto da empresa
    // ========================================
    const { data: empresa } = await supabase
      .from('empresas')
      .select('razao_social, nome_fantasia, cnpj, email, telefone')
      .eq('id', empresa_id)
      .single();

    if (!empresa) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    console.log(`📋 Contexto da empresa: ${empresa.razao_social}`);

    // ========================================
    // 2. Buscar últimas mensagens (contexto da conversa)
    // ========================================
    const { data: historico } = await supabase
      .from('whatsapp_mensagens')
      .select('mensagem, tipo, timestamp')
      .eq('empresa_id', empresa_id)
      .eq('telefone_cliente', telefone_cliente)
      .order('timestamp', { ascending: false })
      .limit(10);

    // ========================================
    // 3. Preparar prompt com contexto
    // ========================================
    const conversaAnterior = historico
      ?.reverse()
      .map(
        (msg) =>
          `${msg.tipo === 'entrada' ? 'Cliente' : 'Você'}: ${msg.mensagem}`
      )
      .join('\n');

    const systemPrompt = `Você é um assistente de atendimento ao cliente para ${empresa.razao_social}.
      
Informações da empresa:
- Nome: ${empresa.razao_social} ${empresa.nome_fantasia ? `(${empresa.nome_fantasia})` : ''}
- CNPJ: ${empresa.cnpj || 'N/A'}
- Email: ${empresa.email || 'N/A'}
- Telefone: ${empresa.telefone || 'N/A'}

Seu papel:
1. Responder com cordialidade e profissionalismo
2. Fornecer informações sobre a empresa quando solicitado
3. Resolver dúvidas comuns
4. Escalar para atendimento humano quando necessário (responda: "Vou conectar com nosso time")
5. Ser conciso (máximo 2-3 linhas)
6. Usar o mesmo idioma do cliente (Português do Brasil)

${conversaAnterior ? `\nContexto da conversa anterior:\n${conversaAnterior}\n` : ''}`;

    const userMessage = `Cliente: ${mensagem}

Responda como o assistente da empresa, de forma breve e útil:`;

    console.log(`💬 Enviando para Claude...`);

    // ========================================
    // 4. Chamar Claude para processar
    // ========================================
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const resposta =
      response.content[0].type === 'text' ? response.content[0].text : '';

    console.log(`✅ Resposta gerada: ${resposta}`);

    // ========================================
    // 5. Salvar resposta no histórico
    // ========================================
    await supabase.from('whatsapp_mensagens').insert({
      empresa_id,
      telefone_cliente,
      mensagem: resposta,
      tipo: 'saida',
      timestamp: new Date(),
      metadata: {
        processado_por: 'agent',
        modelo: 'claude-3-5-haiku-20241022',
        tokens: response.usage.output_tokens,
      },
    });

    // ========================================
    // 6. Registrar tokens consumidos
    // ========================================
    const precoCentavosPorMilToken = {
      input: 0.000004 * 1000, // R$ 0.000004 por token = 0.004 centavos por 1000 tokens
      output: 0.000020 * 1000, // R$ 0.000020 por token = 0.020 centavos por 1000 tokens
    };

    const custo =
      (response.usage.input_tokens * precoCentavosPorMilToken.input) / 1000 +
      (response.usage.output_tokens * precoCentavosPorMilToken.output) / 1000;

    await supabase.from('lancamentos_financeiros').insert({
      empresa_id,
      tipo: 'credito',
      descricao: `Token Claude - WhatsApp (${response.usage.output_tokens} output tokens)`,
      valor: -custo, // Negativo porque é gasto
      categoria: 'api_usage',
      status: 'confirmado',
      metadata: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        modelo: 'claude-3-5-haiku-20241022',
        canal: 'whatsapp',
      },
    });

    console.log(`💰 Custo: R$ ${custo.toFixed(6)}`);

    // ========================================
    // 7. Preparar resposta
    // ========================================
    return NextResponse.json({
      success: true,
      resposta,
      metadata: {
        empresa_id,
        telefone_cliente,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        custo_real: custo,
        pronto_para_enviar_zapi: true,
      },
    });
  } catch (error) {
    console.error('❌ Erro no agent:', error);

    const mensagemErro =
      error instanceof Error ? error.message : 'Erro desconhecido';

    return NextResponse.json(
      {
        success: false,
        error: mensagemErro,
        resposta: 'Desculpe, estou com problemas técnicos. Tente novamente.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent/respond
 * Status do agent
 */
export async function GET() {
  return NextResponse.json({
    status: 'agent_ativo',
    modelo: 'claude-3-5-haiku-20241022',
    capabilities: [
      'processar_mensagens_whatsapp',
      'registrar_token_consumido',
      'salvar_no_historico',
      'responder_com_contexto',
    ],
  });
}
