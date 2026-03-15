import { NextRequest, NextResponse } from 'next/server';

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
    console.log('Body recebido:', body);
    
    const { cotacao_id, preco_unitario, prazo_entrega_dias, condicao_pagamento } = body;

    if (!cotacao_id || preco_unitario === undefined) {
      return NextResponse.json({ error: 'Faltam campos obrigatórios' }, { status: 400 });
    }

    console.log('Atualizando cotação:', cotacao_id);

    // 1. Buscar a cotação para pegar o item_pedido_id
    const cotacoes = await supabaseGet(`cotacoes?id=eq.${cotacao_id}&select=item_pedido_id`);
    if (!cotacoes || cotacoes.length === 0) {
      return NextResponse.json({ error: 'Cotação não encontrada' }, { status: 404 });
    }
    
    const item_pedido_id = cotacoes[0].item_pedido_id;
    console.log('Item pedido ID:', item_pedido_id);

    // 2. Buscar o item para pegar a quantidade correta
    const itens = await supabaseGet(`itens_pedido_compra?id=eq.${item_pedido_id}&select=quantidade`);
    const quantidade = itens?.[0]?.quantidade || 1;
    console.log('Quantidade:', quantidade);

    // 3. Atualizar cotação com preço_total correto
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/cotacoes?id=eq.${cotacao_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          preco_unitario,
          preco_total: preco_unitario * quantidade, // Usar quantidade correta!
          prazo_entrega_dias,
          condicao_pagamento,
          status: 'respondida',
          data_resposta: new Date().toISOString(),
        }),
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error('Erro ao atualizar:', errText);
      return NextResponse.json({ error: 'Erro ao atualizar: ' + errText }, { status: 400 });
    }

    console.log('Cotação atualizada com sucesso');

    return NextResponse.json({
      etapa: 'resposta_recebida',
      cotacao_id,
      preco_unitario,
      mensagem: 'OK',
    });

  } catch (err: any) {
    console.error('Erro:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
