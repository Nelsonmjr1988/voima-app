import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function supabaseGet(path: string) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
  });
  if (!res.ok) throw new Error('GET error: ' + (await res.text()));
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { mapa_cotacao_id } = await request.json();
    if (!mapa_cotacao_id) return NextResponse.json({ error: 'mapa_cotacao_id obrigatorio' }, { status: 400 });

    const mapas = await supabaseGet('mapas_cotacao?id=eq.' + mapa_cotacao_id + '&select=*,pedidos_compra(codigo),empresas(nome_fantasia),obras(nome,cidade,estado)');
    if (!mapas || mapas.length === 0) return NextResponse.json({ error: 'Mapa nao encontrado' }, { status: 404 });
    const mc = mapas[0];

    const cotacoes = await supabaseGet('cotacoes?mapa_cotacao_id=eq.' + mapa_cotacao_id + '&select=*,fornecedores(nome_fantasia,razao_social,tipo,cidade,estado),itens_pedido_compra(descricao_padronizada,descricao_usuario,quantidade,unidade,preco_referencia_sinapi)&order=item_pedido_id,preco_unitario.asc.nullslast');

    const porItem = new Map();
    for (const cot of cotacoes) {
      const itemId = cot.item_pedido_id;
      if (!porItem.has(itemId)) {
        porItem.set(itemId, {
          item: cot.itens_pedido_compra?.descricao_padronizada || cot.itens_pedido_compra?.descricao_usuario,
          quantidade: cot.itens_pedido_compra?.quantidade,
          unidade: cot.itens_pedido_compra?.unidade,
          ref_sinapi: cot.itens_pedido_compra?.preco_referencia_sinapi,
          cotacoes: [],
        });
      }
      porItem.get(itemId).cotacoes.push({
        cotacao_id: cot.id,
        codigo: cot.codigo,
        fornecedor: cot.fornecedores?.nome_fantasia || cot.fornecedores?.razao_social,
        fornecedor_tipo: cot.fornecedores?.tipo,
        fornecedor_cidade: (cot.fornecedores?.cidade || '') + '/' + (cot.fornecedores?.estado || ''),
        preco_unitario: cot.preco_unitario,
        preco_total: cot.preco_total,
        prazo_entrega_dias: cot.prazo_entrega_dias,
        condicao_pagamento: cot.condicao_pagamento,
        observacoes: cot.observacoes_fornecedor,
        status: cot.status,
      });
    }

    const itensComparativo = [];
    let menorTotal = 0;

    for (const [itemId, data] of porItem) {
      const respondidas = data.cotacoes.filter((c: any) => c.status === 'respondida');
      const melhor = respondidas.length > 0 ? Math.min(...respondidas.map((c: any) => c.preco_unitario)) : null;

      itensComparativo.push({
        item_id: itemId,
        descricao: data.item,
        quantidade: data.quantidade,
        unidade: data.unidade,
        ref_sinapi: data.ref_sinapi,
        total_cotacoes: data.cotacoes.length,
        respondidas: respondidas.length,
        melhor_preco: melhor,
        economia_vs_sinapi: (melhor && data.ref_sinapi) ? Math.round((data.ref_sinapi - melhor) * data.quantidade * 100) / 100 : null,
        cotacoes: data.cotacoes.map((c: any) => ({ ...c, is_melhor: c.preco_unitario === melhor && c.status === 'respondida' })),
      });

      if (melhor) menorTotal += melhor * data.quantidade;
    }

    const totalResp = cotacoes.filter((c: any) => c.status === 'respondida').length;
    const totalPend = cotacoes.filter((c: any) => c.status === 'enviada').length;

    return NextResponse.json({
      success: true,
      mapa: { codigo: mc.codigo, status: mc.status, pedido: mc.pedidos_compra?.codigo, empresa: mc.empresas?.nome_fantasia, obra: mc.obras?.nome },
      resumo: { total_cotacoes: cotacoes.length, respondidas: totalResp, pendentes: totalPend, melhor_total: Math.round(menorTotal * 100) / 100, pronto_para_aprovar: totalPend === 0 && totalResp > 0 },
      itens: itensComparativo,
    });
  } catch (error: any) {
    console.error('Mapa error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
