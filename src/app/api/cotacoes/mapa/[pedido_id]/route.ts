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

export async function GET(request: NextRequest, { params }: { params: { pedido_id: string } }) {
  try {
    const { pedido_id } = params;

    if (!pedido_id) {
      return NextResponse.json({ error: 'pedido_id obrigatório' }, { status: 400 });
    }

    // 1. Buscar o pedido e seus itens
    const pedidos = await supabaseGet(`pedidos_compra?id=eq.${pedido_id}&select=*`);
    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }
    const pedido = pedidos[0];

    // 2. Buscar itens
    const itens = await supabaseGet(
      `itens_pedido_compra?pedido_compra_id=eq.${pedido_id}&select=id,descricao_padronizada,quantidade,unidade,preco_referencia_sinapi&order=id`
    );

    // 3. Buscar cotações com fornecedores
    const cotacoes = await supabaseGet(
      `cotacoes?itens_pedido_compra.pedido_compra_id=eq.${pedido_id}&select=id,item_pedido_id,fornecedor_id,preco_unitario,preco_total,prazo_entrega_dias,condicao_pagamento,status,data_resposta,observacoes_fornecedor,itens_pedido_compra(descricao_padronizada,quantidade,unidade,preco_referencia_sinapi),fornecedores(id,nome_fantasia,tipo)&order=item_pedido_id,preco_unitario.asc.nullslast`
    );

    // 4. Organizar dados por item
    const mapaItens: Record<string, any> = {};
    
    for (const item of itens) {
      mapaItens[item.id] = {
        id: item.id,
        descricao: item.descricao_padronizada,
        quantidade: item.quantidade,
        unidade: item.unidade,
        preco_ref_sinapi: item.preco_referencia_sinapi,
        valor_ref_total: item.preco_referencia_sinapi ? item.preco_referencia_sinapi * item.quantidade : 0,
        cotacoes: []
      };
    }

    // 5. Preencher cotações
    for (const cot of cotacoes) {
      if (mapaItens[cot.item_pedido_id]) {
        mapaItens[cot.item_pedido_id].cotacoes.push({
          id: cot.id,
          fornecedor: cot.fornecedores.nome_fantasia,
          fornecedor_id: cot.fornecedor_id,
          preco_unitario: cot.preco_unitario,
          preco_total: cot.preco_total,
          prazo_entrega_dias: cot.prazo_entrega_dias,
          condicao_pagamento: cot.condicao_pagamento,
          observacoes: cot.observacoes_fornecedor,
          status: cot.status,
          data_resposta: cot.data_resposta,
        });
      }
    }

    // 6. Calcular estatísticas
    const stats = {
      total_itens: itens.length,
      total_cotacoes: cotacoes.length,
      respondidas: cotacoes.filter((c: any) => c.status === 'respondida').length,
      pendentes: cotacoes.filter((c: any) => c.status === 'enviada').length,
      valor_ref_total: itens.reduce((t: number, i: any) => t + (i.preco_referencia_sinapi ? i.preco_referencia_sinapi * i.quantidade : 0), 0),
    };

    // 7. Encontrar melhor proposta por item
    const melhorPorItem: Record<string, any> = {};
    for (const itemId of Object.keys(mapaItens)) {
      const cotacoesCom = mapaItens[itemId].cotacoes.filter((c: any) => c.preco_unitario !== null);
      if (cotacoesCom.length > 0) {
        melhorPorItem[itemId] = cotacoesCom.reduce((prev: any, curr: any) => 
          curr.preco_unitario < prev.preco_unitario ? curr : prev
        );
      }
    }

    // 8. Melhor proposta por fornecedor (menor preço total)
    const melhorPorFornecedor: Record<string, any> = {};
    for (const itemId of Object.keys(mapaItens)) {
      for (const cot of mapaItens[itemId].cotacoes) {
        if (cot.preco_total !== null) {
          if (!melhorPorFornecedor[cot.fornecedor]) {
            melhorPorFornecedor[cot.fornecedor] = {
              fornecedor: cot.fornecedor,
              fornecedor_id: cot.fornecedor_id,
              total: 0,
              itens: []
            };
          }
          melhorPorFornecedor[cot.fornecedor].total += cot.preco_total;
          melhorPorFornecedor[cot.fornecedor].itens.push({
            descricao: mapaItens[itemId].descricao,
            preco_total: cot.preco_total
          });
        }
      }
    }

    const fornecedoresRanking = Object.values(melhorPorFornecedor)
      .sort((a: any, b: any) => a.total - b.total)
      .slice(0, 3); // Top 3

    return NextResponse.json({
      pedido_codigo: pedido.codigo,
      etapa: 'mapa_cotacao',
      stats,
      itens_mapa: Object.values(mapaItens),
      melhor_proposta_por_item: melhorPorItem,
      fornecedores_ranking: fornecedoresRanking,
      proxima_etapa: 'Selecionar melhor cotação e gerar ordem de compra',
    });

  } catch (err: any) {
    console.error('Mapa cotacao error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
