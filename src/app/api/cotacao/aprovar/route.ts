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

async function supabaseInsert(table: string, data: any) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('INSERT error: ' + (await res.text()));
  return res.json();
}

async function supabaseUpdate(table: string, id: string, data: any) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('UPDATE error: ' + (await res.text()));
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mapa_cotacao_id, aprovacoes, aprovador_id } = body;

    // aprovacoes = [{ cotacao_id: "uuid" }, { cotacao_id: "uuid" }, ...]
    // Cada cotacao_id é a cotação escolhida por item

    if (!mapa_cotacao_id || !aprovacoes || !aprovacoes.length) {
      return NextResponse.json({ error: 'mapa_cotacao_id e aprovacoes[] obrigatorios' }, { status: 400 });
    }

    // 1. Buscar mapa
    const mapas = await supabaseGet('mapas_cotacao?id=eq.' + mapa_cotacao_id + '&select=*,pedidos_compra(id,codigo,empresa_id,obra_id)');
    if (!mapas || mapas.length === 0) return NextResponse.json({ error: 'Mapa nao encontrado' }, { status: 404 });
    const mc = mapas[0];
    const pc = mc.pedidos_compra;

    // 2. Buscar as cotações aprovadas com detalhes
    const cotacoesAprovadas = [];
    for (const aprov of aprovacoes) {
      const cots = await supabaseGet(
        'cotacoes?id=eq.' + aprov.cotacao_id +
        '&select=*,fornecedores(id,nome_fantasia,razao_social,tipo,cidade,estado,telefone_whatsapp,email),' +
        'itens_pedido_compra(id,descricao_padronizada,quantidade,unidade,preco_referencia_sinapi)'
      );
      if (cots && cots.length > 0) cotacoesAprovadas.push(cots[0]);
    }

    if (cotacoesAprovadas.length === 0) {
      return NextResponse.json({ error: 'Nenhuma cotacao valida encontrada' }, { status: 400 });
    }

    // 3. Marcar cotações como selecionadas
    for (const cot of cotacoesAprovadas) {
      await supabaseUpdate('cotacoes', cot.id, { status: 'selecionada' });
    }

    // 4. Agrupar por fornecedor
    const porFornecedor = new Map();
    for (const cot of cotacoesAprovadas) {
      const fornId = cot.fornecedores.id;
      if (!porFornecedor.has(fornId)) {
        porFornecedor.set(fornId, {
          fornecedor: cot.fornecedores,
          cotacoes: [],
          valor_total: 0,
          condicoes: new Set(),
          prazo_max: 0,
        });
      }
      const grupo = porFornecedor.get(fornId);
      grupo.cotacoes.push(cot);
      grupo.valor_total += cot.preco_total || 0;
      if (cot.condicao_pagamento) grupo.condicoes.add(cot.condicao_pagamento);
      if (cot.prazo_entrega_dias && cot.prazo_entrega_dias > grupo.prazo_max) {
        grupo.prazo_max = cot.prazo_entrega_dias;
      }
    }

    // 5. Criar uma OC por fornecedor
    const ordensGeradas = [];

    for (const [fornId, grupo] of porFornecedor) {
      const condicao = [...grupo.condicoes].join(' / ');

      const ocResult = await supabaseInsert('ordens_compra', {
        pedido_compra_id: pc.id,
        fornecedor_id: fornId,
        empresa_id: pc.empresa_id,
        obra_id: pc.obra_id,
        cotacao_id: grupo.cotacoes[0].id,
        valor_total: Math.round(grupo.valor_total * 100) / 100,
        condicao_pagamento: condicao || null,
        data_entrega_prevista: new Date(Date.now() + grupo.prazo_max * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'emitida',
      });

      const oc = Array.isArray(ocResult) ? ocResult[0] : ocResult;

      const itensResumo = grupo.cotacoes.map((c: any) => ({
        item: c.itens_pedido_compra?.descricao_padronizada,
        quantidade: c.itens_pedido_compra?.quantidade,
        unidade: c.itens_pedido_compra?.unidade,
        preco_unitario: c.preco_unitario,
        preco_total: c.preco_total,
      }));

      ordensGeradas.push({
        oc_id: oc.id,
        oc_codigo: oc.codigo,
        fornecedor: grupo.fornecedor.nome_fantasia || grupo.fornecedor.razao_social,
        fornecedor_tipo: grupo.fornecedor.tipo,
        fornecedor_whatsapp: grupo.fornecedor.telefone_whatsapp,
        fornecedor_email: grupo.fornecedor.email,
        valor_total: oc.valor_total,
        condicao_pagamento: condicao,
        prazo_entrega_dias: grupo.prazo_max,
        data_entrega_prevista: oc.data_entrega_prevista,
        itens: itensResumo,
        mensagem_oc: 'Ordem de Compra ' + oc.codigo + '\n' +
          'Empresa: Silva Engenharia\n' +
          'Obra: ' + (mc.obras?.nome || '') + '\n\n' +
          'Itens:\n' + itensResumo.map((it: any, i: number) =>
            '  ' + (i + 1) + '. ' + it.item + ' - ' + it.quantidade + ' ' + it.unidade + ' x R$ ' + (it.preco_unitario || 0).toFixed(2) + ' = R$ ' + (it.preco_total || 0).toFixed(2)
          ).join('\n') + '\n\n' +
          'Total: R$ ' + oc.valor_total.toFixed(2) + '\n' +
          'Condicao: ' + (condicao || '-') + '\n' +
          'Entrega prevista: ' + oc.data_entrega_prevista + '\n\n' +
          'Favor confirmar recebimento deste pedido.',
      });
    }

    // 6. Atualizar status do mapa e do PC
    await supabaseUpdate('mapas_cotacao', mapa_cotacao_id, {
      status: 'aprovado',
      data_fechamento: new Date().toISOString(),
    });

    await supabaseUpdate('pedidos_compra', pc.id, {
      status: 'ordem_gerada',
      valor_final: Math.round(ordensGeradas.reduce((t: number, oc: any) => t + oc.valor_total, 0) * 100) / 100,
      data_aprovacao: new Date().toISOString(),
      aprovador_id: aprovador_id || null,
    });

    // 7. Retornar
    const valorTotal = ordensGeradas.reduce((t: number, oc: any) => t + oc.valor_total, 0);

    return NextResponse.json({
      success: true,
      resumo: {
        pedido: pc.codigo,
        mapa: mc.codigo,
        total_ordens: ordensGeradas.length,
        valor_total: Math.round(valorTotal * 100) / 100,
        fornecedores: ordensGeradas.length,
      },
      ordens: ordensGeradas,
      mensagem: 'Aprovado! ' + ordensGeradas.length + ' ordem(ns) de compra gerada(s):\n\n' +
        ordensGeradas.map((oc: any) =>
          oc.oc_codigo + ' - ' + oc.fornecedor + ' - R$ ' + oc.valor_total.toFixed(2) + ' (' + oc.itens.length + ' ' + (oc.itens.length > 1 ? 'itens' : 'item') + ')'
        ).join('\n') +
        '\n\nTotal: R$ ' + valorTotal.toFixed(2) +
        '\nProximo passo: enviar OCs aos fornecedores e aguardar entrega.',
    });

  } catch (error: any) {
    console.error('Aprovar error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
