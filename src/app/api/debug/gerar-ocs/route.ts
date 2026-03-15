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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pedido_id = searchParams.get('pedido_id') || '24dde8e0-d511-4135-887e-9565c29af6f5';

    // 1. Buscar itens
    const itens = await supabaseGet(
      `itens_pedido_compra?pedido_compra_id=eq.${pedido_id}&select=id,descricao_padronizada,quantidade`
    );
    console.log('Itens encontrados:', itens.length);

    // 2. Buscar cotações respondidas
    const cotacoes = await supabaseGet(
      `cotacoes?status=eq.respondida&select=id,item_pedido_id,fornecedor_id,preco_unitario,preco_total`
    );
    console.log('Total de cotações respondidas no banco:', cotacoes.length);

    // 3. Filtrar apenas cotações dos itens deste pedido
    const cotacoesPedido = cotacoes.filter((c: any) =>
      itens.some((it: any) => it.id === c.item_pedido_id)
    );
    console.log('Cotações para este pedido:', cotacoesPedido.length);

    // 4. Agrupar por item
    const cotacoesPorItem: { [key: string]: any[] } = {};
    cotacoesPedido.forEach((c: any) => {
      if (!cotacoesPorItem[c.item_pedido_id]) {
        cotacoesPorItem[c.item_pedido_id] = [];
      }
      cotacoesPorItem[c.item_pedido_id].push(c);
    });
    console.log('Itens com cotações:', Object.keys(cotacoesPorItem).length);

    // 5. Buscar fornecedores
    const fornecedores = await supabaseGet(`fornecedores?select=id,nome_fantasia`);

    return NextResponse.json({
      debug: {
        pedido_id,
        itens_count: itens.length,
        itens_sample: itens.map((it: any) => ({ id: it.id, desc: it.descricao_padronizada })),
        cotacoes_respondidas_total: cotacoes.length,
        cotacoes_para_pedido: cotacoesPedido.length,
        cotacoes_sample: cotacoesPedido.slice(0, 5).map((c: any) => ({
          id: c.id,
          item_id: c.item_pedido_id,
          fornecedor_id: c.fornecedor_id,
          preco: c.preco_unitario
        })),
        itens_com_cotacoes: Object.keys(cotacoesPorItem).length,
        fornecedores_total: fornecedores.length,
      }
    });
  } catch (err: any) {
    console.error('Debug error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
