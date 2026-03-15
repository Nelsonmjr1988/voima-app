import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function supabaseGet(path: string) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
  });
  if (!res.ok) throw new Error('GET: ' + (await res.text()));
  return res.json();
}

async function supabaseUpdate(table: string, id: string, data: any) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('UPDATE: ' + (await res.text()));
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pedido_id, simular_todas } = body;

    if (!pedido_id) {
      return NextResponse.json({ error: 'pedido_id obrigatório' }, { status: 400 });
    }

    // 1. Buscar itens do pedido
    const itens = await supabaseGet(
      `itens_pedido_compra?pedido_compra_id=eq.${pedido_id}&select=id,preco_referencia_sinapi`
    );

    // 2. Buscar cotações enviadas
    const cotacoes = await supabaseGet(
      `cotacoes?itens_pedido_compra.pedido_compra_id=eq.${pedido_id}&status=eq.enviada&select=id,item_pedido_id,itens_pedido_compra(quantidade,preco_referencia_sinapi),fornecedores(nome_fantasia)`
    );

    const respostasSimuladas: any[] = [];

    // 3. Gerar respostas simuladas
    for (const cot of cotacoes) {
      const precoRef = cot.itens_pedido_compra?.preco_referencia_sinapi || 100;
      
      // Simular variação de preço: -15% a +20% do preço SINAPI
      const variacao = Math.random() * 0.35 - 0.15; // -15% a +20%
      const precoUnitario = Math.round((precoRef * (1 + variacao)) * 100) / 100;
      
      // Simular prazo: 3 a 15 dias
      const prazoDias = Math.floor(Math.random() * 13) + 3;
      
      // Simular condições de pagamento
      const condicoes = ['À vista', '30 dias', '15/30', '7/15/30'];
      const condicao = condicoes[Math.floor(Math.random() * condicoes.length)];

      const quantidade = cot.itens_pedido_compra?.quantidade || 1;
      const precoTotal = Math.round((precoUnitario * quantidade) * 100) / 100;

      // Atualizar cotação
      await supabaseUpdate('cotacoes', cot.id, {
        preco_unitario: precoUnitario,
        preco_total: precoTotal,
        prazo_entrega_dias: prazoDias,
        condicao_pagamento: condicao,
        status: 'respondida',
        data_resposta: new Date().toISOString(),
        observacoes_fornecedor: `Simulação automática - ${cot.fornecedores?.nome_fantasia || 'Fornecedor'}`,
      });

      respostasSimuladas.push({
        cotacao_id: cot.id,
        fornecedor: cot.fornecedores?.nome_fantasia,
        preco_ref: precoRef,
        preco_unitario: precoUnitario,
        variacao_percentual: ((variacao * 100).toFixed(1) + '%'),
        preco_total: precoTotal,
        prazo_dias: prazoDias,
        condicao_pagamento: condicao,
      });
    }

    return NextResponse.json({
      etapa: 'respostas_simuladas',
      pedido_id,
      total_respostas: respostasSimuladas.length,
      respostas: respostasSimuladas,
      proxima_etapa: 'Consultar mapa de cotações e selecionar melhor proposta',
    });

  } catch (err: any) {
    console.error('Simular respostas error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
