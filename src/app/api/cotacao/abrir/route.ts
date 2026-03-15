import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function supabaseGet(path: string) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
  });
  if (!res.ok) throw new Error('GET error: ' + (await res.text()));
  return res.json();
}

async function supabaseInsert(table: string, data: any, returnData: boolean = true) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': returnData ? 'return=representation' : 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('INSERT error ' + table + ': ' + (await res.text()));
  if (!returnData) return null;
  return res.json();
}

async function supabaseUpdate(table: string, id: string, data: any) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + id, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('UPDATE error: ' + (await res.text()));
  return res.json();
}

async function buscarFornecedoresRegiao(categoria: string, cidade: string, estado: string) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/buscar_fornecedores_regiao', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
    },
    body: JSON.stringify({ p_categoria: categoria, p_cidade: cidade, p_estado: estado, p_limite: 10 }),
  });
  if (!res.ok) return [];
  return res.json();
}

async function askHaiku(systemPrompt: string, userMessage: string): Promise<{text: string, inputTokens: number, outputTokens: number}> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, system: systemPrompt, messages: [{ role: 'user', content: userMessage }] }),
  });
  if (!res.ok) throw new Error('Anthropic error ' + res.status);
  const data = await res.json();
  return {
    text: data.content?.find((b: any) => b.type === 'text')?.text || '',
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0
  };
}

// Mapear categoria do SINAPI pra categoria de fornecedor
function mapearCategoria(categoriaSinapi: string, descricao: string): string[] {
  const d = descricao.toUpperCase();
  if (d.includes('CIMENTO')) return ['cimento'];
  if (d.includes('AREIA') || d.includes('BRITA') || d.includes('PEDRA BRITADA')) return ['areia', 'brita', 'agregado'];
  if (d.includes('ACO') || d.includes('FERRO') || d.includes('VERGALHAO')) return ['aco', 'ferro', 'estrutural_aco'];
  if (d.includes('TUBO') || d.includes('PVC') || d.includes('ESGOTO')) return ['hidraulico', 'tubo', 'pvc'];
  if (d.includes('BLOCO') || d.includes('TIJOLO')) return ['bloco', 'alvenaria'];
  if (d.includes('TINTA') || d.includes('VERNIZ')) return ['pintura'];
  if (d.includes('FIO') || d.includes('CABO') || d.includes('ELETRODUTO')) return ['eletrico'];
  return ['diversos'];
}

async function registrarTokensAnthropoic(empresaId: string, inputTokens: number, outputTokens: number) {
  try {
    const totalTokens = inputTokens + outputTokens;
    const custo_total = (inputTokens * 0.000004) + (outputTokens * 0.000020); // Preços reais em R$
    const custo_unitario = totalTokens > 0 ? custo_total / totalTokens : 0;
    
    await fetch(SUPABASE_URL + '/rest/v1/tokens_consumidos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
      },
      body: JSON.stringify({
        empresa_id: empresaId,
        tipo: 'supplier_selection',
        tokens_usados: totalTokens,
        custo_unitario: custo_unitario,
        custo_total: custo_total,
        meta_dados: {
          model: 'claude-haiku-4-5-20251001',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          preco_input: 0.000004,
          preco_output: 0.000020
        },
        mes_referencia: new Date().toISOString().substring(0, 7)
      }),
    });
  } catch (err) {
    console.error('Erro ao registrar tokens:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { pedido_compra_id } = await request.json();

    if (!pedido_compra_id) {
      return NextResponse.json({ error: 'pedido_compra_id obrigatorio' }, { status: 400 });
    }

    // 1. Buscar o PC
    const pcs = await supabaseGet('pedidos_compra?id=eq.' + pedido_compra_id + '&select=*,empresas(nome_fantasia,cnpj),obras(nome,cidade,estado)');
    if (!pcs || pcs.length === 0) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 });
    }
    const pc = pcs[0];

    // 2. Buscar itens do PC
    const itens = await supabaseGet('itens_pedido_compra?pedido_compra_id=eq.' + pedido_compra_id + '&select=*');
    if (!itens || itens.length === 0) {
      return NextResponse.json({ error: 'Pedido sem itens' }, { status: 400 });
    }

    const obraCidade = pc.obras?.cidade || 'Catalão';
    const obraEstado = pc.obras?.estado || 'GO';
    const empresaNome = pc.empresas?.nome_fantasia || 'Cliente';

    // 3. Criar Mapa de Cotação
    const mcResult = await supabaseInsert('mapas_cotacao', {
      pedido_compra_id: pc.id,
      empresa_id: pc.empresa_id,
      obra_id: pc.obra_id,
      status: 'cotando',
    });
    const mc = Array.isArray(mcResult) ? mcResult[0] : mcResult;

    // 4. Para cada item, buscar fornecedores e criar cotações
    const cotacoesCriadas = [];
    const fornecedoresContatados = new Map(); // evitar duplicar mensagem pro mesmo fornecedor

    for (const item of itens) {
      const categorias = mapearCategoria(item.categoria || '', item.descricao_padronizada || item.descricao_usuario || '');

      // Buscar fornecedores pra cada categoria do item
      let fornecedores: any[] = [];
      for (const cat of categorias) {
        const found = await buscarFornecedoresRegiao(cat, obraCidade, obraEstado);
        fornecedores.push(...found);
      }

      // Deduplica fornecedores
      const seenForn = new Set();
      fornecedores = fornecedores.filter(f => {
        if (seenForn.has(f.id)) return false;
        seenForn.add(f.id);
        return true;
      });

      // Limitar a 5 fornecedores por item (priorizados por relevância)
      fornecedores = fornecedores.slice(0, 5);

      // Criar cotação pra cada fornecedor
      for (const forn of fornecedores) {
        const cotResult = await supabaseInsert('cotacoes', {
          item_pedido_id: item.id,
          mapa_cotacao_id: mc.id,
          fornecedor_id: forn.id,
          canal_envio: forn.telefone_whatsapp ? 'whatsapp' : 'email',
          status: 'enviada',
          data_envio: new Date().toISOString(),
          data_expiracao: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        });
        const cot = Array.isArray(cotResult) ? cotResult[0] : cotResult;

        cotacoesCriadas.push({
          cotacao_codigo: cot.codigo,
          item: item.descricao_padronizada || item.descricao_usuario,
          quantidade: item.quantidade,
          unidade: item.unidade,
          fornecedor: forn.nome_fantasia || forn.razao_social,
          fornecedor_tipo: forn.tipo,
          fornecedor_cidade: forn.cidade + '/' + forn.estado,
          fornecedor_whatsapp: forn.telefone_whatsapp,
          fornecedor_email: forn.email,
          relevancia: forn.relevancia,
        });

        // Agrupar itens por fornecedor pra mensagem
        if (!fornecedoresContatados.has(forn.id)) {
          fornecedoresContatados.set(forn.id, {
            nome: forn.nome_fantasia || forn.razao_social,
            whatsapp: forn.telefone_whatsapp,
            email: forn.email,
            tipo: forn.tipo,
            itens: [],
          });
        }
        fornecedoresContatados.get(forn.id).itens.push({
          descricao: item.descricao_padronizada || item.descricao_usuario,
          quantidade: item.quantidade,
          unidade: item.unidade,
        });
      }
    }

    // 5. Atualizar status do PC
    await supabaseUpdate('pedidos_compra', pc.id, { status: 'cotando' });

    // 6. Gerar mensagens de cotação por fornecedor
    const mensagensPorFornecedor = [];

    for (const [fornId, forn] of fornecedoresContatados) {
      const listaItens = forn.itens.map((it: any, i: number) =>
        '  ' + (i + 1) + '. ' + it.descricao + ' - ' + it.quantidade + ' ' + it.unidade
      ).join('\n');

      const mensagem = 'Bom dia!\n' +
        'Somos da ' + empresaNome + '.\n' +
        'Precisamos de cotacao ref. ' + mc.codigo + ':\n\n' +
        listaItens + '\n\n' +
        'Entrega: ' + obraCidade + '/' + obraEstado + '\n' +
        'Favor enviar: preco unitario, prazo de entrega e condicao de pagamento.\n' +
        'Obrigado!';

      mensagensPorFornecedor.push({
        fornecedor_id: fornId,
        fornecedor_nome: forn.nome,
        fornecedor_tipo: forn.tipo,
        whatsapp: forn.whatsapp,
        email: forn.email,
        total_itens: forn.itens.length,
        mensagem,
      });
    }

    // 7. Retornar resumo
    return NextResponse.json({
      success: true,
      mapa_cotacao: {
        id: mc.id,
        codigo: mc.codigo,
        status: mc.status,
      },
      pedido: {
        codigo: pc.codigo,
        obra: pc.obras?.nome,
        empresa: empresaNome,
      },
      resumo: {
        total_itens: itens.length,
        total_cotacoes: cotacoesCriadas.length,
        total_fornecedores: fornecedoresContatados.size,
      },
      fornecedores: mensagensPorFornecedor,
      cotacoes: cotacoesCriadas,
    });

  } catch (error: any) {
    console.error('Cotacao error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
