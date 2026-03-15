import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const SYSTEM_PROMPT = `Você é o agente de compras da Voima, plataforma de gestão de compras para construtoras.

Interprete mensagens de pedidos de compra de mestres de obra e engenheiros.

REGRAS:
1. Pode ter VÁRIOS itens separados por vírgula, "e" ou quebra de linha.
2. Extraia: material, quantidade, unidade.
3. Linguagem de canteiro: "200 sc cimento", "1 carga areia", "ferro de meia", "tijolo baiano".
4. termos_busca: palavras pra buscar no SINAPI. USE O NOME TÉCNICO quando souber:
   - "cimento" → ["cimento portland"]
   - "areia" → ["areia"]
   - "areia grossa" → ["areia grossa"]
   - "brita 1" → ["pedra britada n. 1"]
   - "brita 0" ou "pedrisco" → ["pedra britada n. 0"]
   - "brita" sem numero → ["pedra britada"]
   - "ferro 10mm" → ["aco ca-50, 10"]
   - "ferro de meia" → ["aco ca-50, 12"]
   - "tubo esgoto 100" → ["tubo pvc esgoto 100"]
   - "tijolo baiano" → ["bloco ceramico vedacao"]
   - "tijolo" → ["bloco ceramico"]
5. Unidades: mantenha como o usuario falou. "sc"="sc", "m3"="m3", "carga"="carga".
6. Se material ambiguo, requer_confirmacao_material=true.
7. Se unidade ambigua ("carga"), requer_confirmacao_unidade=true.

JSON puro, sem markdown:
{
  "itens": [
    {
      "descricao_usuario": "texto original",
      "material": "nome",
      "termos_busca": ["termo tecnico"],
      "quantidade": 200,
      "unidade_usuario": "sc",
      "requer_confirmacao_unidade": false,
      "requer_confirmacao_material": true,
      "motivo_confirmacao": "qual tipo?"
    }
  ],
  "mensagem_entendida": true
}`;

async function askHaiku(systemPrompt: string, userMessage: string): Promise<{text: string, inputTokens: number, outputTokens: number}> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error('Anthropic error ' + res.status + ': ' + (await res.text()));
  const data = await res.json();
  return {
    text: data.content?.find((b: any) => b.type === 'text')?.text || '',
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0
  };
}

async function buscarSinapi(termo: string) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/buscar_sinapi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
    },
    body: JSON.stringify({ termo: termo, limite: 8 }),
  });
  if (!res.ok) return [];
  return res.json();
}

async function getConversao(termo: string, categoria?: string) {
  const normalized = termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (!normalized) return null;

  if (categoria) {
    const url = SUPABASE_URL + '/rest/v1/conversao_unidades?termo_usuario=eq.' + encodeURIComponent(normalized) + '&categoria_material=eq.' + encodeURIComponent(categoria) + '&limit=1';
    const res = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } });
    if (res.ok) { const d = await res.json(); if (d.length > 0) return d[0]; }
  }

  const url2 = SUPABASE_URL + '/rest/v1/conversao_unidades?termo_usuario=eq.' + encodeURIComponent(normalized) + '&limit=1';
  const res2 = await fetch(url2, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } });
  if (res2.ok) { const d2 = await res2.json(); return d2[0] || null; }
  return null;
}

async function selecionarProduto(descUsuario: string, produtos: any[], tokenAcc?: {input: number, output: number}): Promise<any> {
  if (produtos.length === 0) return { selecionado: null, opcoes: [] };
  if (produtos.length === 1) return { selecionado: 1, confianca: 'alta' };

  const lista = produtos.map((p: any, i: number) =>
    (i + 1) + '. ' + (p.nome_simples || p.descricao_basica) + ' (' + p.unidade + ')' + (p.preco_referencia ? ' - R$ ' + p.preco_referencia : '')
  ).join('\n');

  const result = await askHaiku(
    'Selecione o produto SINAPI mais adequado. Responda SOMENTE JSON puro.',
    'Pedido: "' + descUsuario + '"\n\nProdutos:\n' + lista + '\n\nSe da pra escolher UM: {"selecionado": N, "confianca": "alta"}\nSe ambiguo: {"selecionado": null, "confianca": "baixa", "opcoes": [N1,N2], "pergunta": "pergunta curta"}'
  );
  
  // Acumular tokens
  if (tokenAcc) {
    tokenAcc.input += result.inputTokens;
    tokenAcc.output += result.outputTokens;
  }
  
  try {
    return JSON.parse(result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  } catch {
    return { selecionado: null, opcoes: produtos.map((_: any, i: number) => i + 1) };
  }
}

async function registrarTokensAnthropoic(empresaId: string, inputTokens: number, outputTokens: number) {
  try {
    const totalTokens = inputTokens + outputTokens;
    const custo_total = (inputTokens * 0.000004) + (outputTokens * 0.000020); // Preços reais em R$
    const custo_unitario = totalTokens > 0 ? custo_total / totalTokens : 0;
    
    await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/tokens_consumidos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({
        empresa_id: empresaId,
        tipo: 'agent_interpretation',
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
    const { message, empresa_id } = await request.json();
    if (!message) return NextResponse.json({ error: 'Mensagem obrigatoria' }, { status: 400 });
    if (!ANTHROPIC_API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY nao configurada' }, { status: 500 });
    if (!empresa_id) return NextResponse.json({ error: 'empresa_id obrigatoria para rastrear custos' }, { status: 400 });

    // ETAPA 1: Interpretar
    const resultInterpret = await askHaiku(SYSTEM_PROMPT, 'Mensagem: "' + message + '"');
    
    // ✅ REGISTRAR: Primeiro uso de tokens (interpret) - OBRIGATÓRIO
    await registrarTokensAnthropoic(empresa_id, resultInterpret.inputTokens, resultInterpret.outputTokens);
    
    let parsed;
    try {
      parsed = JSON.parse(resultInterpret.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch {
      return NextResponse.json({ success: false, error: 'Erro ao interpretar', raw: resultInterpret.text }, { status: 500 });
    }

    if (!parsed.mensagem_entendida || !parsed.itens?.length) {
      return NextResponse.json({ success: false, itens: [], observacao: 'Nao entendi o pedido.' });
    }

    // Acumulador para tokens das chamadas internas
    const tokenAcc = { input: 0, output: 0 };

    // ETAPA 2: Enriquecer cada item
    const itens = [];
    for (const item of parsed.itens) {
      // Buscar SINAPI
      let produtos: any[] = [];
      for (const termo of (item.termos_busca || [item.material])) {
        const r = await buscarSinapi(termo);
        produtos.push(...r);
      }
      const seen = new Set();
      produtos = produtos.filter(p => { if (seen.has(p.codigo_sinapi)) return false; seen.add(p.codigo_sinapi); return true; });

      // Conversao
      const materialBase = item.material.split(' ')[0].toLowerCase();
      const conversao = await getConversao(item.unidade_usuario || '', materialBase);

      // Calcular fator de preco
      // Se unidade_sinapi=SC e fator=50, significa 1 SC = 50 KG
      // Preco SINAPI em KG, usuario quer em SC, entao preco_sc = preco_kg * 50
      const fatorPreco = (conversao && conversao.fator_conversao && conversao.unidade_sinapi === 'SC')
        ? conversao.fator_conversao
        : 1;

      // Selecao inteligente
      const selecao = await selecionarProduto(item.descricao_usuario, produtos, tokenAcc);

      let produtoFinal = null;
      let opcoes = null;
      let pergunta = item.motivo_confirmacao || null;

      if (selecao.selecionado && selecao.confianca === 'alta') {
        const p = produtos[selecao.selecionado - 1];
        if (p) produtoFinal = {
          codigo: p.codigo_sinapi,
          nome: p.nome_simples || p.descricao_basica,
          unidade_sinapi: p.unidade,
          unidade_pedido: item.unidade_usuario ? item.unidade_usuario.toUpperCase() : p.unidade,
          preco_unitario_sinapi: p.preco_referencia,
          preco_por_unidade_pedido: p.preco_referencia ? Math.round(p.preco_referencia * fatorPreco * 100) / 100 : null,
          estimativa_total: p.preco_referencia ? Math.round(p.preco_referencia * fatorPreco * item.quantidade * 100) / 100 : null,
        };
      } else {
        const indices = selecao.opcoes || produtos.map((_: any, i: number) => i + 1);
        opcoes = indices.map((n: number) => {
          const p = produtos[n - 1];
          return p ? {
            codigo: p.codigo_sinapi,
            nome: p.nome_simples || p.descricao_basica,
            unidade_sinapi: p.unidade,
            unidade_pedido: item.unidade_usuario ? item.unidade_usuario.toUpperCase() : p.unidade,
            preco_unitario_sinapi: p.preco_referencia,
            preco_por_unidade_pedido: p.preco_referencia ? Math.round(p.preco_referencia * fatorPreco * 100) / 100 : null,
            estimativa_total: p.preco_referencia ? Math.round(p.preco_referencia * fatorPreco * item.quantidade * 100) / 100 : null,
          } : null;
        }).filter(Boolean);
        pergunta = selecao.pergunta || pergunta;
      }

      itens.push({
        descricao_usuario: item.descricao_usuario,
        material: item.material,
        quantidade: item.quantidade,
        unidade: item.unidade_usuario,
        produto_selecionado: produtoFinal,
        opcoes_material: opcoes,
        requer_confirmacao_material: !produtoFinal && (opcoes?.length || 0) > 1,
        pergunta_material: !produtoFinal ? pergunta : undefined,
        requer_confirmacao_unidade: item.requer_confirmacao_unidade || (conversao?.requer_confirmacao === true),
        pergunta_unidade: conversao?.pergunta_confirmacao || undefined,
      });
    }

    // ✅ REGISTRAR: Tokens acumulados das chamadas internas (seleções)
    if (tokenAcc.input > 0 || tokenAcc.output > 0) {
      await registrarTokensAnthropoic(empresa_id, tokenAcc.input, tokenAcc.output);
    }

    return NextResponse.json({
      success: true,
      mensagem_original: message,
      itens,
      total_itens: itens.length,
      requer_interacao: itens.some((i: any) => i.requer_confirmacao_material || i.requer_confirmacao_unidade),
    });
  } catch (error: any) {
    console.error('Agent error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
