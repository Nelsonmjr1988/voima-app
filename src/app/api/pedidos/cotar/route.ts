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

async function supabaseInsert(table: string, data: any) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('INSERT: ' + (await res.text()));
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
    const { pedido_compra_id } = body;

    if (!pedido_compra_id) {
      return NextResponse.json({ error: 'pedido_compra_id obrigatório' }, { status: 400 });
    }

    // 1. Buscar o pedido de compra
    const pedidos = await supabaseGet(`pedidos_compra?id=eq.${pedido_compra_id}&select=*`);
    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }
    const pedido = pedidos[0];

    // 2. Buscar itens do pedido
    const itens = await supabaseGet(`itens_pedido_compra?pedido_compra_id=eq.${pedido_compra_id}&select=*`);
    if (!itens || itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum item encontrado no pedido' }, { status: 404 });
    }

    // 3. Buscar fornecedores ativos
    const fornecedores = await supabaseGet('fornecedores?status=eq.ativo&select=id,nome_fantasia,email,telefone_whatsapp');
    if (!fornecedores || fornecedores.length === 0) {
      return NextResponse.json({ error: 'Nenhum fornecedor disponível' }, { status: 404 });
    }

    // 4. Criar cotações para cada item + fornecedor
    const cotacoesIds: string[] = [];
    for (const item of itens) {
      for (const fornecedor of fornecedores) {
        const cotacao = await supabaseInsert('cotacoes', {
          item_pedido_id: item.id,
          fornecedor_id: fornecedor.id,
          canal_envio: 'email',
          status: 'enviada',
          data_envio: new Date().toISOString(),
        });
        
        if (Array.isArray(cotacao)) {
          cotacoesIds.push(cotacao[0]?.id);
        } else {
          cotacoesIds.push(cotacao?.id);
        }
      }
    }

    // 5. Atualizar status do pedido para 'aguardando_aprovacao' (se necessário)
    // await supabaseUpdate('pedidos_compra', pedido_compra_id, { status: 'em_cotacao' });

    // 6. Preparar resumo para envio
    const itensResumo = itens.map((it: any) => ({
      descricao: it.descricao_padronizada,
      quantidade: it.quantidade,
      unidade: it.unidade,
      preco_ref_sinapi: it.preco_referencia_sinapi,
    }));

    return NextResponse.json({
      etapa: 'cotacao_iniciada',
      pedido_id: pedido_compra_id,
      pedido_codigo: pedido.codigo,
      total_cotacoes: cotacoesIds.length,
      cotacoes_por_item: itens.length,
      fornecedores_convidados: fornecedores.length,
      valor_referencia: pedido.valor_estimado,
      itens: itensResumo,
      proxima_etapa: 'Aguardando respostas dos fornecedores',
    });

  } catch (err: any) {
    console.error('Cotacao error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
