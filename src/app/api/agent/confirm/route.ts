import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function askHaikuMultiturn(systemPrompt: string, messages: any[]): Promise<{text: string, inputTokens: number, outputTokens: number}> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2048, system: systemPrompt, messages }),
  });
  if (!res.ok) throw new Error('Anthropic error ' + res.status + ': ' + (await res.text()));
  const data = await res.json();
  return {
    text: data.content?.find((b: any) => b.type === 'text')?.text || '',
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0
  };
}

async function supabaseGet(path: string) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
  });
  if (!res.ok) throw new Error('GET: ' + (await res.text()));
  return res.json();
}

async function supabaseInsert(table: string, data: any, returnData: boolean = true) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': returnData ? 'return=representation' : 'return=minimal' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('INSERT: ' + (await res.text()));
  if (!returnData) return null;
  return res.json();
}

async function supabaseRpc(fn: string, params: any) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
    body: JSON.stringify(params),
  });
  if (!res.ok) return [];
  return res.json();
}

async function buscarSinapi(termo: string) {
  return supabaseRpc('buscar_sinapi', { termo, limite: 6 });
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
        tipo: 'agent_confirmation',
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

async function buscarObrasEmpresa(empresaId: string) {
  try { return await supabaseGet('obras?empresa_id=eq.' + empresaId + '&status=eq.ativa&select=id,nome,cidade&order=nome'); } catch { return []; }
}

// ==========================================
// ABORDAGEM 1: Contexto por historico
// ==========================================
async function montarContextoHistorico(usuarioId: string, empresaId: string, obraId?: string): Promise<string> {
  let ctx = '';

  // Ultimos pedidos do usuario
  try {
    const pedidos = await supabaseGet(
      'pedidos_compra?solicitante_id=eq.' + usuarioId +
      '&select=codigo,created_at,valor_estimado,itens_pedido_compra(descricao_padronizada,quantidade,unidade,preco_referencia_sinapi)' +
      '&order=created_at.desc&limit=5'
    );
    if (pedidos && pedidos.length > 0) {
      ctx += '\n[ULTIMOS PEDIDOS DESTE USUARIO]\n';
      for (const pc of pedidos) {
        const itensStr = (pc.itens_pedido_compra || []).map((it: any) => it.descricao_padronizada + ' ' + it.quantidade + ' ' + it.unidade).join(', ');
        ctx += '- ' + pc.codigo + ': ' + itensStr + '\n';
      }
    }
  } catch {}

  // Ultimas compras da obra (precos reais)
  if (obraId) {
    try {
      const ocs = await supabaseGet(
        'ordens_compra?obra_id=eq.' + obraId + '&status=in.(entregue,paga)' +
        '&select=codigo,valor_total,created_at,fornecedores(nome_fantasia)' +
        '&order=created_at.desc&limit=5'
      );
      if (ocs && ocs.length > 0) {
        ctx += '\n[ULTIMAS COMPRAS DESTA OBRA - PRECOS REAIS]\n';
        for (const oc of ocs) {
          ctx += '- ' + oc.codigo + ': R$ ' + oc.valor_total + ' - ' + (oc.fornecedores?.nome_fantasia || '') + '\n';
        }
      }
    } catch {}
  }

  return ctx;
}

// ==========================================
// ABORDAGEM 2: Aprendizados do banco
// ==========================================
async function montarContextoAprendizados(usuarioId: string, empresaId: string): Promise<string> {
  try {
    const aprends = await supabaseRpc('buscar_contexto_usuario', { p_usuario_id: usuarioId, p_empresa_id: empresaId });
    if (!aprends || aprends.length === 0) return '';

    let ctx = '\n[PREFERENCIAS APRENDIDAS - use quando o usuario nao especificar]\n';

    const prefs = aprends.filter((a: any) => a.tipo === 'preferencia_material');
    const aliases = aprends.filter((a: any) => a.tipo === 'alias_produto');

    if (prefs.length > 0) {
      ctx += 'Quando pedir sem especificar tipo:\n';
      for (const p of prefs) {
        ctx += '- "' + p.chave + '" = ' + p.valor + (p.confianca >= 3 ? ' (ALTA confianca, ' + p.confianca + 'x confirmado - pode assumir direto)' : ' (confianca ' + p.confianca + 'x - confirme)') + '\n';
      }
    }

    if (aliases.length > 0) {
      ctx += 'Apelidos que este usuario usa:\n';
      for (const a of aliases) {
        ctx += '- "' + a.chave + '" = ' + a.valor + '\n';
      }
    }

    return ctx;
  } catch { return ''; }
}

// ==========================================
// Registrar aprendizados apos confirmar pedido
// ==========================================
async function registrarAprendizados(itens: any[], usuarioId: string, empresaId: string, obraId: string) {
  for (const item of itens) {
    if (item.status !== 'confirmado') continue;

    // Registrar preferencia de material
    const chave = (item.descricao_usuario || '').toLowerCase()
      .replace(/\d+/g, '').replace(/\s*(sc|m3|m³|un|kg|barras?|sacos?|metros?)\s*/gi, '')
      .replace(/\s+/g, ' ').trim();

    if (chave && item.descricao_padronizada) {
      try {
        await supabaseRpc('registrar_aprendizado', {
          p_tipo: 'preferencia_material',
          p_usuario_id: usuarioId,
          p_empresa_id: empresaId,
          p_obra_id: obraId,
          p_chave: chave,
          p_valor: item.descricao_padronizada,
          p_codigo_sinapi: item.codigo_sinapi || null,
          p_metadata: JSON.stringify({ preco_ref: item.preco_ref, unidade: item.unidade }),
        });
      } catch {}
    }
  }
}

// ==========================================
// SINAPI context builder
// ==========================================
async function buscarContextoSinapi(message: string): Promise<string> {
  const mapeamentos: Record<string, string> = {
    'cimento': 'cimento portland', 'areia': 'areia', 'brita': 'pedra britada',
    'ferro': 'aco ca-50', 'aco': 'aco ca-50', 'tijolo': 'bloco ceramico',
    'tijolos': 'bloco ceramico', 'bloco': 'bloco ceramico', 'tubo': 'tubo pvc',
    'tinta': 'tinta', 'argamassa': 'argamassa', 'capacete': 'capacete',
    'luva': 'luva', 'bota': 'bota', 'cano': 'tubo pvc',
  };

  const palavras = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(p => p.length > 3)
    .filter(p => !['sacos','saco','metros','metro','carga','barras','barra','pares','unidades','quero','preciso','manda','favor','pedido','fazer'].includes(p));

  let contexto = '';
  const jaVistos = new Set();
  for (const palavra of palavras) {
    const termoBusca = mapeamentos[palavra] || palavra;
    if (jaVistos.has(termoBusca)) continue;
    jaVistos.add(termoBusca);
    const produtos = await buscarSinapi(termoBusca);
    if (produtos.length > 0) {
      contexto += '\n' + termoBusca.toUpperCase() + ':\n';
      for (const p of produtos.slice(0, 5)) {
        const nome = p.nome_simples || p.descricao_basica;
        contexto += '  - [' + p.codigo_sinapi + '] ' + nome + ' (' + p.unidade + ')' + (p.preco_referencia ? ' ref: R$ ' + p.preco_referencia : '') + '\n';
      }
    }
  }
  return contexto;
}

// ==========================================
// System prompt builder
// ==========================================
function buildSystemPrompt(obras: any[]): string {
  let obrasTexto = '';
  if (obras.length > 1) {
    obrasTexto = '\n\nOBRAS ATIVAS:\n' + obras.map((o: any, i: number) => (i+1) + '. ' + o.nome + (o.cidade ? ' (' + o.cidade + ')' : '')).join('\n') + '\nSEMPRE pergunte qual obra quando houver mais de uma.';
  } else if (obras.length === 1) {
    obrasTexto = '\n\nEmpresa tem 1 obra ativa: ' + obras[0].nome + '. Assuma essa obra.';
  }

  return 'Voce e o comprador da Voima, plataforma de compras para construtoras. Conversa natural no WhatsApp.' + obrasTexto + '\n\nSEU TRABALHO:\n1. Interpretar o que o usuario quer comprar\n2. VERIFICAR CADA ITEM - se tem variacao, PERGUNTAR. Se PREFERENCIAS APRENDIDAS indicam com ALTA confianca, pode assumir direto sem perguntar.\n3. Quando TODOS itens claros, apresentar resumo e pedir confirmacao\n4. "ok","isso","fechado","bora","pode","beleza" = confirmacao\n\nREGRAS:\n- ANALISE TODOS os itens. NAO ignore nenhum.\n- Cimento: perguntar tipo (a menos que preferencia com alta confianca)\n- Areia: perguntar tipo (a menos que preferencia)\n- Brita: se nao especificou numero, perguntar\n- Tijolo/Bloco: perguntar dimensao\n- Ferro/Aco: confirmar bitola e tipo\n- Argamassa: perguntar tipo\n- EPI/ferramentas: aceitar como material livre\n- Se usuario JA especificou (ex: "brita 1"), NAO pergunte de novo\n- Use as PREFERENCIAS APRENDIDAS: se confianca >= 3, assuma direto e so confirme no resumo final\n\nDados SINAPI serao fornecidos como contexto. Use codigos e precos.\n\nJSON obrigatorio:\n{\n  "resposta_usuario": "texto natural WhatsApp",\n  "itens": [{"descricao_usuario":"como pediu","descricao_padronizada":"nome correto","codigo_sinapi":1379,"quantidade":200,"unidade":"SC","preco_ref":36.00,"status":"confirmado ou pendente","livre":false}],\n  "obra_confirmada": "nome obra" ou null,\n  "pedido_pronto": false,\n  "aguardando_confirmacao": false\n}\n\nIMPORTANTE:\n- NUNCA perca itens\n- Mantenha confirmados como confirmados\n- pedido_pronto=true so quando TODOS confirmados E obra definida\n- aguardando_confirmacao=true quando apresentou resumo e espera ok';
}

// ==========================================
// MAIN ENDPOINT
// ==========================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, message, conversation, empresa_id, usuario_id } = body;

    if (action === 'confirmar') return await criarPedido(body);
    if (!message) return NextResponse.json({ error: 'message obrigatoria' }, { status: 400 });

    const eid = empresa_id || '85b50c5c-abf2-4bed-9854-a15fb0d60d2b';
    const uid = usuario_id || '33a3874f-dd4b-427d-81f4-ec86b6f14156';

    // Buscar obras
    const obras = await buscarObrasEmpresa(eid);

    // ABORDAGEM 1: Contexto historico
    const ctxHistorico = await montarContextoHistorico(uid, eid, obras.length === 1 ? obras[0].id : undefined);

    // ABORDAGEM 2: Aprendizados
    const ctxAprendizados = await montarContextoAprendizados(uid, eid);

    // Contexto SINAPI
    const ctxSinapi = await buscarContextoSinapi(message);

    // Montar mensagens
    const msgs = conversation || [];
    let userMsg = message;
    const contextos = [ctxSinapi, ctxHistorico, ctxAprendizados].filter(Boolean).join('\n');
    if (contextos) userMsg += '\n\n[DADOS DO SISTEMA - use para responder melhor]\n' + contextos;
    msgs.push({ role: 'user', content: userMsg });

    const systemPrompt = buildSystemPrompt(obras);
    const resultConfirm = await askHaikuMultiturn(systemPrompt, msgs);
    
    // ✅ REGISTRAR: Tokens da confirmação - OBRIGATÓRIO
    if (empresa_id) {
      await registrarTokensAnthropoic(empresa_id, resultConfirm.inputTokens, resultConfirm.outputTokens);
    }

    let parsed;
    try {
      parsed = JSON.parse(resultConfirm.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch {
      return NextResponse.json({ resposta: resultConfirm.text, itens: [], pedido_pronto: false, aguardando_confirmacao: false, conversation: [...(conversation || []), { role: 'user', content: message }, { role: 'assistant', content: resultConfirm.text }] });
    }

    const convAtualizada = [...(conversation || []), { role: 'user', content: message }, { role: 'assistant', content: JSON.stringify(parsed) }];

    // Resolver obra
    let obraId = null;
    let obraNome = parsed.obra_confirmada || null;
    if (obras.length === 1) { obraId = obras[0].id; obraNome = obras[0].nome; }
    else if (parsed.obra_confirmada) {
      const found = obras.find((o: any) => o.nome.toLowerCase().includes(parsed.obra_confirmada.toLowerCase()));
      if (found) { obraId = found.id; obraNome = found.nome; }
    }

    if (parsed.pedido_pronto && !parsed.aguardando_confirmacao) {
      return NextResponse.json({ resposta: parsed.resposta_usuario, itens: parsed.itens, pedido_pronto: true, criar_pedido: true, obra_id: obraId, obra_nome: obraNome, conversation: convAtualizada });
    }

    return NextResponse.json({ resposta: parsed.resposta_usuario, itens: parsed.itens, pedido_pronto: parsed.pedido_pronto || false, aguardando_confirmacao: parsed.aguardando_confirmacao || false, obra_id: obraId, obra_nome: obraNome, conversation: convAtualizada });

  } catch (error: any) {
    console.error('Agent error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// CRIAR PEDIDO + REGISTRAR APRENDIZADOS
// ==========================================
async function criarPedido(body: any) {
  const { itens, obra_id, solicitante_id, empresa_id, mensagem_original } = body;
  if (!itens || !obra_id || !solicitante_id || !empresa_id) return NextResponse.json({ error: 'Faltam: itens, obra_id, solicitante_id, empresa_id' }, { status: 400 });

  try {
    const itensConfirmados = itens.filter((it: any) => it.status === 'confirmado');
    const valorEst = itensConfirmados.reduce((t: number, it: any) => t + ((it.preco_ref || 0) * (it.quantidade || 0)), 0);

    const pcResult = await supabaseInsert('pedidos_compra', {
      empresa_id, obra_id, solicitante_id, mensagem_original: mensagem_original || '',
      valor_estimado: Math.round(valorEst * 100) / 100, status: 'aguardando_aprovacao',
      data_solicitacao: new Date().toISOString(),
    });
    const pc = Array.isArray(pcResult) ? pcResult[0] : pcResult;
    if (!pc?.id) return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 });

    // Inserir cada item individualmente
    for (const it of itensConfirmados) {
      await supabaseInsert('itens_pedido_compra', {
        pedido_compra_id: pc.id,
        descricao_usuario: it.descricao_usuario || '',
        descricao_padronizada: it.descricao_padronizada || it.descricao_usuario || '',
        quantidade: it.quantidade || 0,
        unidade: (it.unidade || 'UN').toUpperCase(),
        quantidade_original: it.quantidade || 0,
        unidade_original: it.unidade || '',
        preco_referencia_sinapi: it.preco_ref || null,
        status: 'confirmado',
      }, false);
    }

    // REGISTRAR APRENDIZADOS
    await registrarAprendizados(itensConfirmados, solicitante_id, empresa_id, obra_id);

    const resumo = itensConfirmados.map((it: any, i: number) => {
      const nome = it.descricao_padronizada || it.descricao_usuario;
      const tot = it.preco_ref ? (it.preco_ref * it.quantidade) : null;
      return '  ' + (i+1) + '. ' + nome + ' - ' + it.quantidade + ' ' + (it.unidade||'').toUpperCase() + (tot ? ' (ref: R$ ' + tot.toFixed(2) + ')' : ' (sem ref. SINAPI)');
    }).join('\n');

    return NextResponse.json({
      etapa: 'confirmado',
      pedido: { id: pc.id, codigo: pc.codigo, status: pc.status, valor_estimado: pc.valor_estimado },
      mensagem: 'Pedido ' + pc.codigo + ' criado!\n\n' + resumo + (valorEst > 0 ? '\n\nRef SINAPI: R$ ' + valorEst.toFixed(2) : '') + '\nProximo: abrir cotacao com fornecedores',
    });
  } catch (err: any) {
    console.error('Criar error:', err);
    return NextResponse.json({ error: 'Erro: ' + err.message }, { status: 500 });
  }
}
