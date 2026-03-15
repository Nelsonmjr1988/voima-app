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
    const searchParams = request.nextUrl.searchParams;
    const pedido_id = searchParams.get('pedido_id') || '24dde8e0-d511-4135-887e-9565c29af6f5';

    const debug: any = { steps: [] };

    // Step 1: Fetch pedido and itens
    const pedidos = await supabaseGet(`pedidos_compra?id=eq.${pedido_id}&select=*`);
    const itens = await supabaseGet(`itens_pedido_compra?pedido_compra_id=eq.${pedido_id}&select=*`);
    
    debug.steps.push({
      step: 1,
      pedidos_count: pedidos.length,
      itens_count: itens.length,
      itens_ids: itens.map((i: any) => i.id),
    });

    // Step 2: Fetch respondidas
    const todasCotacoes = await supabaseGet(`cotacoes?status=eq.respondida&select=*`);
    const cotacoesPedido = todasCotacoes.filter((c: any) =>
      itens.some((it: any) => it.id === c.item_pedido_id)
    );

    debug.steps.push({
      step: 2,
      todas_respondidas: todasCotacoes.length,
      cotacoes_pedido: cotacoesPedido.length,
    });

    // Step 3: Select best for each item
    const melhorCotacaoPorItem: { [key: string]: any } = {};

    itens.forEach((item: any) => {
      const cotacoesItem = cotacoesPedido.filter((c: any) => c.item_pedido_id === item.id);

      if (cotacoesItem.length > 0) {
        const melhor = cotacoesItem.reduce((prev: any, curr: any) => {
          const precoAtual = curr.preco_unitario || 999999;
          const precoAnterior = prev.preco_unitario || 999999;
          return precoAtual < precoAnterior ? curr : prev;
        });
        melhorCotacaoPorItem[item.id] = melhor;
      }
    });

    debug.steps.push({
      step: 3,
      melhor_count: Object.keys(melhorCotacaoPorItem).length,
      melhor_keys: Object.keys(melhorCotacaoPorItem),
    });

    // Step 4: Group by fornecedor - using EXACT logic from gerar-ocs
    const itensPorFornecedor: { [fornecedor_id: string]: any[] } = {};

    itens.forEach((item: any) => {
      const melhorCot = melhorCotacaoPorItem[item.id];
      
      if (melhorCot) {
        if (!itensPorFornecedor[melhorCot.fornecedor_id]) {
          itensPorFornecedor[melhorCot.fornecedor_id] = [];
        }
        itensPorFornecedor[melhorCot.fornecedor_id].push({
          item,
          cotacao: melhorCot,
          preco_unitario: melhorCot.preco_unitario,
          preco_total: melhorCot.preco_total || (melhorCot.preco_unitario * item.quantidade),
        });
      }
    });

    debug.steps.push({
      step: 4,
      fornecedores_count: Object.keys(itensPorFornecedor).length,
      fornecedores_ids: Object.keys(itensPorFornecedor),
      fornecedores_details: Object.entries(itensPorFornecedor).map(([f_id, items]) => ({
        fornecedor_id: f_id,
        quantidade_itens: items.length,
      })),
    });

    // Step 5: Try to create OCs
    const ordensGeradas: any[] = [];

    for (const [fornecedor_id, itensDoFornecedor] of Object.entries(itensPorFornecedor)) {
      const valor_total = (itensDoFornecedor as any[]).reduce(
        (total, itemInfo) => total + (itemInfo.preco_total || 0),
        0
      );

      ordensGeradas.push({
        fornecedor_id,
        valor_total,
        quantidade_itens: itensDoFornecedor.length,
      });
    }

    debug.steps.push({
      step: 5,
      ordens_geradas_count: ordensGeradas.length,
      ordens: ordensGeradas,
    });

    return NextResponse.json(debug);

  } catch (err: any) {
    return NextResponse.json({ erro: String(err) }, { status: 500 });
  }
}
