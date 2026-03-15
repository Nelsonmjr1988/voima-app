import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function supabaseUpdate(table: string, id: string, data: any) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('UPDATE error: ' + (await res.text()));
  return res.json();
}

async function supabaseGet(path: string) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
  });
  if (!res.ok) throw new Error('GET error: ' + (await res.text()));
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { cotacao_id, preco_unitario, prazo_entrega_dias, condicao_pagamento, observacoes } = await request.json();

    if (!cotacao_id || !preco_unitario) {
      return NextResponse.json({ error: 'cotacao_id e preco_unitario obrigatorios' }, { status: 400 });
    }

    // Buscar cotação pra pegar quantidade do item
    const cots = await supabaseGet('cotacoes?id=eq.' + cotacao_id + '&select=*,itens_pedido_compra(quantidade,unidade,descricao_padronizada)');
    if (!cots || cots.length === 0) return NextResponse.json({ error: 'Cotacao nao encontrada' }, { status: 404 });
    const cot = cots[0];

    const quantidade = cot.itens_pedido_compra?.quantidade || 0;
    const precoTotal = Math.round(preco_unitario * quantidade * 100) / 100;

    // Atualizar cotação
    const updated = await supabaseUpdate('cotacoes', cotacao_id, {
      preco_unitario: preco_unitario,
      preco_total: precoTotal,
      prazo_entrega_dias: prazo_entrega_dias || null,
      condicao_pagamento: condicao_pagamento || null,
      observacoes_fornecedor: observacoes || null,
      data_resposta: new Date().toISOString(),
      status: 'respondida',
    });

    const cotAtualizada = Array.isArray(updated) ? updated[0] : updated;

    return NextResponse.json({
      success: true,
      cotacao: {
        codigo: cotAtualizada.codigo,
        item: cot.itens_pedido_compra?.descricao_padronizada,
        quantidade: quantidade,
        unidade: cot.itens_pedido_compra?.unidade,
        preco_unitario: preco_unitario,
        preco_total: precoTotal,
        prazo_entrega_dias,
        condicao_pagamento,
        status: 'respondida',
      },
    });
  } catch (error: any) {
    console.error('Lancar error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
