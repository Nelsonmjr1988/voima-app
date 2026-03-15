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
    const pedido_id = searchParams.get('pedido_id');

    if (!pedido_id) {
      return NextResponse.json({ error: 'pedido_id é obrigatório' }, { status: 400 });
    }

    const trace: any[] = [];

    // Step 1: Fetch pedido
    trace.push({ step: 1, action: 'Buscando pedido', pedido_id });
    const pedidos = await supabaseGet(`pedidos_compra?id=eq.${pedido_id}&select=*`);
    trace.push({ step: 1, result: pedidos?.length > 0 ? 'OK' : 'ERRO', data: pedidos });

    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json({ error: 'Pedido não encontrado', trace }, { status: 404 });
    }

    // Step 2: Fetch itens
    trace.push({ step: 2, action: 'Buscando itens', pedido_id });
    const itens = await supabaseGet(`itens_pedido_compra?pedido_compra_id=eq.${pedido_id}&select=*`);
    trace.push({ step: 2, result: itens?.length > 0 ? 'OK' : 'SEM ITENS', count: itens?.length });

    if (!itens || itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum item no pedido', trace }, { status: 400 });
    }

    // Step 3: Fetch ALL respondidas quotations
    trace.push({ step: 3, action: 'Buscando todas cotacoes COM status=respondida' });
    const todasCotacoes = await supabaseGet(`cotacoes?status=eq.respondida&select=*`);
    trace.push({ step: 3, result: 'OK', total_respondidas: todasCotacoes?.length });

    // Step 4: Filter for this order
    trace.push({
      step: 4,
      action: 'Filtrando cotacoes para este pedido',
      item_ids: itens.map((i: any) => ({ id: i.id, desc: i.descricao_padronizada })),
    });

    const cotacoesPedido = todasCotacoes.filter((c: any) =>
      itens.some((it: any) => it.id === c.item_pedido_id)
    );

    trace.push({
      step: 4,
      result: cotacoesPedido.length > 0 ? 'OK' : 'NENHUMA',
      cotacoes_para_pedido: cotacoesPedido.length,
    });

    if (cotacoesPedido.length === 0) {
      trace.push({
        step: 5,
        warning: 'Cotações respondidas total != 0 mas nenhuma corresponde aos itens',
        debug_info: {
          todos_pedido_ids: cotacoesPedido.map((c: any) => c.item_pedido_id),
          item_ids_esperados: itens.map((i: any) => i.id),
          sample_cotacoes: todasCotacoes.slice(0, 3).map((c: any) => ({
            id: c.id,
            item_pedido_id: c.item_pedido_id,
            status: c.status,
            preco: c.preco_unitario,
          })),
        },
      });

      return NextResponse.json({ trace });
    }

    // Step 5: Select best for each item
    trace.push({ step: 5, action: 'Selecionando melhor cotacao por item' });
    const melhorCotacaoPorItem: { [key: string]: any } = {};

    itens.forEach((item: any) => {
      const cotacoesItem = cotacoesPedido.filter((c: any) => c.item_pedido_id === item.id);
      const itemTrace = {
        item_id: item.id,
        descricao: item.descricao_padronizada,
        cotacoes_count: cotacoesItem.length,
      };

      if (cotacoesItem.length > 0) {
        const melhor = cotacoesItem.reduce((prev: any, curr: any) => {
          const precoAtual = curr.preco_unitario || 0;
          const precoAnterior = prev.preco_unitario || 0;
          return precoAtual < precoAnterior ? curr : prev;
        });

        melhorCotacaoPorItem[item.id] = melhor;
        (itemTrace as any).melhor = {
          fornecedor_id: melhor.fornecedor_id,
          preco: melhor.preco_unitario,
        };
      }

      trace.push({ step: 5, itemTrace });
    });

    trace.push({
      step: 5,
      result: 'OK',
      melhor_count: Object.keys(melhorCotacaoPorItem).length,
    });

    // Step 6: Group by fornecedor
    trace.push({ step: 6, action: 'Agrupando por fornecedor' });
    const itensPorFornecedor: { [fornecedor_id: string]: any[] } = {};

    itens.forEach((item: any) => {
      const melhorCot = melhorCotacaoPorItem[item.id];

      if (melhorCot) {
        if (!itensPorFornecedor[melhorCot.fornecedor_id]) {
          itensPorFornecedor[melhorCot.fornecedor_id] = [];
        }
        itensPorFornecedor[melhorCot.fornecedor_id].push(item.id);
      }
    });

    trace.push({
      step: 6,
      result: 'OK',
      fornecedores: Object.keys(itensPorFornecedor).length,
      detalhe: Object.entries(itensPorFornecedor).map(([forn_id, items_ids]) => ({
        fornecedor_id: forn_id,
        quantidade_itens: items_ids.length,
      })),
    });

    return NextResponse.json({ trace, final_fornecedores: Object.keys(itensPorFornecedor).length });
  } catch (err: any) {
    return NextResponse.json({ error: String(err), stack: err.stack }, { status: 500 });
  }
}
