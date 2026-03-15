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

async function supabaseInsert(table: string, data: any) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('INSERT: ' + (await res.text()));
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
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
    const { pedido_id, criterio = 'melhor_preco' } = body;

    if (!pedido_id) {
      return NextResponse.json({ error: 'pedido_id é obrigatório' }, { status: 400 });
    }

    console.log('[NEW] Iniciando gerar-ocs com pedido_id:', pedido_id);

    // Step 1: Fetch pedido and itens
    const pedidos = await supabaseGet(`pedidos_compra?id=eq.${pedido_id}&select=*`);
    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }
    const pedido = pedidos[0];
    console.log('[NEW] Pedido encontrado:', pedido.codigo);

    const itens = await supabaseGet(`itens_pedido_compra?pedido_compra_id=eq.${pedido_id}&select=*`);
    if (!itens || itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum item no pedido' }, { status: 400 });
    }
    console.log('[NEW] Itens:', itens.length);

    // Step 2: Fetch respondidas
    const todasCotacoes = await supabaseGet(`cotacoes?status=eq.respondida&select=*`);
    const cotacoesPedido = todasCotacoes.filter((c: any) =>
      itens.some((it: any) => it.id === c.item_pedido_id)
    );
    console.log('[NEW] Cotações respondidas para este pedido:', cotacoesPedido.length);

    if (cotacoesPedido.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhuma cotação respondida para este pedido'
      }, { status: 400 });
    }

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

    console.log('[NEW] Melhor cotação selecionada para', Object.keys(melhorCotacaoPorItem).length, 'itens');

    // Step 4: Group by fornecedor
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

    console.log('[NEW] Agrupados em', Object.keys(itensPorFornecedor).length, 'fornecedores');

    // Step 5: Create OCs and send emails
    const ordensGeradas: any[] = [];

    for (const [fornecedor_id, itensDoFornecedor] of Object.entries(itensPorFornecedor)) {
      try {
        const valor_total = (itensDoFornecedor as any[]).reduce(
          (total, itemInfo) => total + (itemInfo.preco_total || 0),
          0
        );

        console.log(`[NEW] Criando OC para fornecedor ${fornecedor_id} com valor ${valor_total}`);

        const ocData = {
          pedido_compra_id: pedido_id,
          fornecedor_id: fornecedor_id,
          empresa_id: pedido.empresa_id,
          obra_id: pedido.obra_id,
          valor_total: Math.round(valor_total * 100) / 100,
          status: 'emitida',
          data_emissao: new Date().toISOString(),
        };

        const ocResult = await supabaseInsert('ordens_compra', ocData);
        const oc = Array.isArray(ocResult) ? ocResult[0] : ocResult;

        console.log(`[NEW] OC criada com ID ${oc.id}`);

        // Fetch fornecedor data
        const fornecedores = await supabaseGet(
          `fornecedores?id=eq.${fornecedor_id}&select=nome_fantasia,email,telefone_whatsapp`
        );
        const fornecedor = fornecedores?.[0];

        // Send OC via email (async - fire and forget)
        if (oc?.id && fornecedor?.email) {
          console.log(`[NEW] Enviando OC para ${fornecedor.email}`);
          fetch(new URL('/api/pedidos/enviar-oc-v2', request.url), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ordem_compra_id: oc.id,
              email_fornecedor: fornecedor.email,
              numero_whatsapp: fornecedor.telefone,
              itens_oc: (itensDoFornecedor as any[]).map((i: any) => ({
                descricao: i.item.descricao_padronizada,
                quantidade: i.item.quantidade,
                unidade: i.item.unidade,
                preco_unitario: i.preco_unitario,
                preco_total: i.preco_total,
              })),
            }),
          }).catch((err) => console.error('[NEW] Erro ao enviar OC:', err));
        }

        ordensGeradas.push({
          id: oc?.id,
          codigo: oc?.codigo,
          fornecedor: fornecedor?.nome_fantasia || 'Fornecedor',
          email: fornecedor?.email,
          valor_total: Math.round(valor_total * 100) / 100,
          quantidade_itens: itensDoFornecedor.length,
        });

      } catch (err: any) {
        console.error('[NEW] Erro ao criar OC:', err);
        throw err; // Re-throw para debugar
      }
    }

    console.log('[NEW] Total OCs criadas:', ordensGeradas.length);

    // Update pedido status
    try {
      await supabaseUpdate('pedidos_compra', pedido_id, { status: 'ordem_gerada' });
    } catch (e) {
      console.error('[NEW] Erro ao atualizar pedido:', e);
    }

    return NextResponse.json({
      etapa: 'ordensGeradas',
      pedido_codigo: pedido.codigo,
      total_ordens: ordensGeradas.length,
      ordens_compra: ordensGeradas,
      valor_total_pedido: ordensGeradas.reduce((sum: number, oc: any) => sum + oc.valor_total, 0),
      mensagem: `${ordensGeradas.length} Ordem(ns) de Compra gerada(s) e enviada(s)`,
    });

  } catch (err: any) {
    console.error('[NEW] Erro ao gerar OCs:', err);
    return NextResponse.json(
      { error: err.message, stack: err.stack }, 
      { status: 500 }
    );
  }
}
