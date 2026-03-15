import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=representation',
};

async function dbGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

async function dbInsert(table: string, data: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  const result = text ? JSON.parse(text) : {};
  return Array.isArray(result) ? result[0] : result;
}

// GET /api/pedidos - listar pedidos
export async function GET() {
  try {
    const pedidos = await dbGet('pedidos_compra?select=*,obras(nome)&order=created_at.desc&limit=50');
    return NextResponse.json({ pedidos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/pedidos - criar pedido + itens + cotações automáticas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empresa_id, obra_id, mensagem_original, itens, solicitante_id } = body;

    if (!empresa_id || !obra_id || !itens?.length) {
      return NextResponse.json(
        { error: 'empresa_id, obra_id e itens são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar solicitante padrão se não informado
    let solicitanteId = solicitante_id;
    if (!solicitanteId) {
      const usuarios = await dbGet(`usuarios?empresa_id=eq.${empresa_id}&limit=1`).catch(() => []);
      solicitanteId = usuarios[0]?.id || '33a3874f-dd4b-427d-81f4-ec86b6f14156';
    }

    // 1. Calcular valor estimado
    const valorEstimado = itens.reduce(
      (sum: number, item: any) => sum + (item.preco_ref_sinapi || 0) * (item.quantidade || 0),
      0
    );

    // 2. Criar pedido
    const pedido = await dbInsert('pedidos_compra', {
      empresa_id,
      obra_id,
      solicitante_id: solicitanteId,
      mensagem_original: mensagem_original || '',
      valor_estimado: valorEstimado,
      status: 'aguardando_aprovacao',
      data_solicitacao: new Date().toISOString(),
    });

    if (!pedido?.id) throw new Error('Falha ao criar pedido');

    // 3. Criar itens
    const itensInseridos: any[] = [];
    for (const item of itens) {
      const itemInserido = await dbInsert('itens_pedido_compra', {
        pedido_compra_id: pedido.id,
        descricao_usuario: item.descricao,
        descricao_padronizada: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        quantidade_original: item.quantidade,
        unidade_original: item.unidade?.toLowerCase(),
        preco_referencia_sinapi: item.preco_ref_sinapi || 0,
        status: 'confirmado',
      });
      itensInseridos.push(itemInserido);
    }

    // 4. Criar cotações para cada item × fornecedor ativo
    const fornecedores = await dbGet('fornecedores?status=eq.ativo&select=id,nome_fantasia&limit=20');
    let totalCotacoes = 0;

    for (const item of itensInseridos) {
      if (!item?.id) continue;
      for (const fornecedor of fornecedores) {
        await dbInsert('cotacoes', {
          item_pedido_id: item.id,
          fornecedor_id: fornecedor.id,
          canal_envio: 'email',
          status: 'enviada',
          data_envio: new Date().toISOString(),
        }).catch(() => null); // ignora duplicata
        totalCotacoes++;
      }
    }

    return NextResponse.json({
      pedido_id: pedido.id,
      pedido_codigo: pedido.codigo,
      status: pedido.status,
      valor_estimado: valorEstimado,
      itens_criados: itensInseridos.length,
      cotacoes_criadas: totalCotacoes,
      fornecedores_convidados: fornecedores.length,
      mensagem: `Pedido ${pedido.codigo} criado com ${itensInseridos.length} itens e ${totalCotacoes} cotações enviadas`,
    });
  } catch (err: any) {
    console.error('Erro ao criar pedido:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
