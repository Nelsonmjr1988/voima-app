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

    // 1. Buscar o pedido
    const pedidos = await supabaseGet(`pedidos_compra?id=eq.${pedido_id}&select=*`);
    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // 2. Buscar itens do pedido
    const itens = await supabaseGet(`itens_pedido_compra?pedido_compra_id=eq.${pedido_id}&select=*`);

    // 3. Buscar TODAS as cotações (sem filtro)
    const todasCotacoes = await supabaseGet(`cotacoes?select=*`);

    // 4. Buscar cotações respondidas
    const cotacoesRespondidas = todasCotacoes.filter((c: any) => c.status === 'respondida');

    // 5. Filtrar cotações deste pedido
    const cotacoesPedido = cotacoesRespondidas.filter((c: any) =>
      itens.some((it: any) => it.id === c.item_pedido_id)
    );

    // 6. Detalhe por item
    const detalhesPorItem = itens.map((item: any) => {
      const cotacoesItem = cotacoesPedido.filter(
        (c: any) => c.item_pedido_id === item.id
      );

      const melhorCotacao = cotacoesItem.length > 0
        ? cotacoesItem.reduce((prev: any, curr: any) => {
            const precoAtual = curr.preco_unitario;
            const precoAnterior = prev.preco_unitario;
            return precoAtual < precoAnterior ? curr : prev;
          })
        : null;

      return {
        item_id: item.id,
        descricao: item.descricao_padronizada,
        quantidade: item.quantidade,
        cotacoes_total: cotacoesItem.length,
        melhor_preco: melhorCotacao?.preco_unitario || null,
        melhor_fornecedor_id: melhorCotacao?.fornecedor_id || null,
        cotacoes_amostra: cotacoesItem.slice(0, 3).map((c: any) => ({
          fornecedor_id: c.fornecedor_id,
          preco: c.preco_unitario,
        })),
      };
    });

    // 7. Agrupar por fornecedor
    const grupos: { [key: string]: any[] } = {};
    itens.forEach((item: any) => {
      const melhorCot = cotacoesPedido.find(
        (c: any) =>
          c.item_pedido_id === item.id &&
          c.preco_unitario === Math.min(
            ...cotacoesPedido
              .filter((ct: any) => ct.item_pedido_id === item.id)
              .map((ct: any) => ct.preco_unitario)
          )
      );

      if (melhorCot) {
        if (!grupos[melhorCot.fornecedor_id]) {
          grupos[melhorCot.fornecedor_id] = [];
        }
        grupos[melhorCot.fornecedor_id].push({
          item_id: item.id,
          preco: melhorCot.preco_unitario,
        });
      }
    });

    return NextResponse.json({
      debug_detalhado: {
        pedido_id,
        total_itens: itens.length,
        total_cotacoes_db: todasCotacoes.length,
        cotacoes_respondidas_db: cotacoesRespondidas.length,
        cotacoes_para_este_pedido: cotacoesPedido.length,
        
        detalhe_por_item: detalhesPorItem,
        
        agrupamento_por_fornecedor: Object.entries(grupos).map(([fornecedor_id, items]) => ({
          fornecedor_id,
          quantidade_itens: items.length,
          itens: items,
        })),
        
        total_fornecedores_com_itens: Object.keys(grupos).length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
