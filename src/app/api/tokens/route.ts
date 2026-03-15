import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
};

async function supabaseGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path}: ${await res.text()}`);
  return res.json();
}

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
 * POST /api/tokens/registrar
 * Registra consumo de tokens (AI, email, WhatsApp)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empresa_id, tipo, tokens_usados, meta_dados, pedido_id, cotacao_id } = body;

    if (!empresa_id || !tipo) {
      return NextResponse.json(
        { error: 'empresa_id e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    // 1. Buscar pricing para este tipo de operação
    const pricing = await supabaseGet(
      `token_pricing?tipo_operacao=eq.${encodeURIComponent(tipo)}&select=*`
    );

    if (!pricing || pricing.length === 0) {
      return NextResponse.json(
        { error: `Tipo de operação não configurado: ${tipo}` },
        { status: 400 }
      );
    }

    const preco_config = pricing[0];
    let custo_total = 0;

    if (preco_config.preco_fixo) {
      custo_total = parseFloat(preco_config.preco_fixo);
    } else if (preco_config.preco_por_token && tokens_usados) {
      custo_total = tokens_usados * parseFloat(preco_config.preco_por_token);
    }

    // 2. Registrar consumo
    const mes = new Date().toISOString().slice(0, 7); // YYYY-MM

    const registro = await supabasePost('tokens_consumidos', {
      empresa_id,
      tipo,
      tokens_usados: tokens_usados || 0,
      custo_unitario: preco_config.preco_por_token || 0,
      custo_total,
      pedido_id,
      cotacao_id,
      meta_dados,
      mes_referencia: mes,
    });

    // 3. Atualizar custos agregados
    const custos = await supabaseGet(
      `custos_mensais_empresa?empresa_id=eq.${empresa_id}&mes_referencia=eq.${mes}&select=*`
    );

    if (custos && custos.length > 0) {
      // Atualizar existing
      const custo_atual = custos[0];
      const novo_total_tokens = (parseFloat(custo_atual.total_tokens_custo || 0) + custo_total).toFixed(2);
      
      await fetch(`${SUPABASE_URL}/rest/v1/custos_mensais_empresa?id=eq.${custo_atual.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          total_tokens_custo: novo_total_tokens,
          custo_total_mes: (parseFloat(custo_atual.custo_operacional || 0) + parseFloat(novo_total_tokens)).toFixed(2),
          updated_at: new Date().toISOString(),
        }),
      });
    }

    return NextResponse.json({
      sucesso: true,
      registro_id: registro[0]?.id,
      custo_registrado: custo_total.toFixed(2),
      mensagem: `${tokens_usados || 1} tokens registrados para ${tipo}`,
    });
  } catch (err: any) {
    console.error('TOKEN REGISTER ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/tokens/custos/{empresa_id}
 * Retorna custos de tokens por empresa em um período
 */
export async function GET(request: NextRequest, { params }: any) {
  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes') || new Date().toISOString().slice(0, 7);
    
    // Empresa ID pode vir de params ou query
    const empresa_id = params?.empresa_id || searchParams.get('empresa_id');

    if (!empresa_id) {
      return NextResponse.json(
        { error: 'empresa_id obrigatório' },
        { status: 400 }
      );
    }

    // 1. Buscar custos agregados
    const custos = await supabaseGet(
      `custos_mensais_empresa?empresa_id=eq.${empresa_id}&mes_referencia=eq.${mes}&select=*`
    );

    // 2. Buscar detalhamento por tipo
    const detalhes = await supabaseGet(
      `tokens_consumidos?empresa_id=eq.${empresa_id}&mes_referencia=eq.${mes}&select=tipo,COUNT(),SUM(tokens_usados),SUM(custo_total)`
    );

    // 3. Buscar lançamentos do mês
    const lancamentos = await supabaseGet(
      `lancamentos?empresa_id=eq.${empresa_id}&mes_referencia=eq.${mes}&select=tipo,SUM(valor)`
    );

    return NextResponse.json({
      empresa_id,
      mes_referencia: mes,
      custos_tokens: custos[0] || null,
      detalhes_por_tipo: detalhes || [],
      custos_operacionais: lancamentos || [],
      resumo: {
        total_tokens_mes: custos[0]?.total_tokens_custo || 0,
        total_operacional: custos[0]?.custo_operacional || 0,
        total_mes: custos[0]?.custo_total_mes || 0,
      },
    });
  } catch (err: any) {
    console.error('TOKEN GET ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
