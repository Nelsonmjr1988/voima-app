import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    const { cotacao_id, preco_unitario, prazo_entrega_dias, condicao_pagamento, observacoes } = body;

    if (!cotacao_id || preco_unitario === undefined) {
      return NextResponse.json({ 
        error: 'Faltam: cotacao_id, preco_unitario' 
      }, { status: 400 });
    }

    // Buscar cotação - sem join complexo
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/cotacoes?id=eq.${cotacao_id}&select=id,item_pedido_id`,
      {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Erro ao buscar cotação: ' + (await res.text()) }, { status: 400 });
    }

    const cotacoes = await res.json();
    if (!cotacoes || cotacoes.length === 0) {
      return NextResponse.json({ error: 'Cotação não encontrada' }, { status: 404 });
    }

    const cot = cotacoes[0];
    
    // Buscar item do pedido para pegar a quantidade
    const itemRes = await fetch(
      `${SUPABASE_URL}/rest/v1/itens_pedido_compra?id=eq.${cot.item_pedido_id}&select=quantidade`,
      {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
      }
    );
    const itemData = await itemRes.json();
    const quantidade = itemData[0]?.quantidade || 1;
    const preco_total = Math.round((preco_unitario * quantidade) * 100) / 100;

    // Atualizar cotação com resposta
    await supabaseUpdate('cotacoes', cotacao_id, {
      preco_unitario,
      preco_total,
      prazo_entrega_dias: prazo_entrega_dias || null,
      condicao_pagamento: condicao_pagamento || null,
      observacoes_fornecedor: observacoes || null,
      status: 'respondida',
      data_resposta: new Date().toISOString(),
    });

    return NextResponse.json({
      etapa: 'resposta_recebida',
      cotacao_id,
      preco_unitario,
      preco_total,
      prazo_entrega_dias,
      condicao_pagamento,
      mensagem: 'Resposta de cotação registrada com sucesso',
    });

  } catch (err: any) {
    console.error('Resposta cotacao error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
