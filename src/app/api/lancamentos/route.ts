import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
};

async function supabasePost(path: string, body: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path}: ${await res.text()}`);
  return res.json();
}

async function supabaseGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path}: ${await res.text()}`);
  return res.json();
}

/**
 * POST /api/lancamentos
 * Criar novo lançamento (despesa ou receita)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      empresa_id,
      obra_id,
      tipo, // 'material', 'mao_obra', 'imposto', 'frete', 'outro'
      descricao,
      valor,
      categoria,
      comprovante_url,
    } = body;

    if (!empresa_id || !tipo || !descricao || !valor) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: empresa_id, tipo, descricao, valor' },
        { status: 400 }
      );
    }

    const mes = new Date().toISOString().slice(0, 7);

    // 1. Criar lançamento
    const lancamento = await supabasePost('lancamentos', {
      empresa_id,
      obra_id,
      tipo,
      descricao,
      valor: parseFloat(valor),
      mes_referencia: mes,
      categoria,
      comprovante_url,
      status: 'confirmado',
    });

    // 2. Verificar se custos_mensais_empresa existe
    const custos_existente = await supabaseGet(
      `custos_mensais_empresa?empresa_id=eq.${empresa_id}&mes_referencia=eq.${mes}&select=id`
    );

    if (!custos_existente || custos_existente.length === 0) {
      // Criar novo registro de custos
      await supabasePost('custos_mensais_empresa', {
        empresa_id,
        mes_referencia: mes,
        custo_operacional: parseFloat(valor),
        custo_total_mes: parseFloat(valor),
      });
    } else {
      // Atualizar existing
      const id = custos_existente[0].id;
      await fetch(`${SUPABASE_URL}/rest/v1/custos_mensais_empresa?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          custo_operacional: parseFloat(`${parseFloat(custos_existente[0].custo_operacional || 0) + parseFloat(valor)}`),
          updated_at: new Date().toISOString(),
        }),
      });
    }

    return NextResponse.json({
      sucesso: true,
      lancamento_id: lancamento[0]?.id,
      mensagem: `Lançamento de ${tipo} criado: ${descricao}`,
      dados: lancamento[0],
    });
  } catch (err: any) {
    console.error('LANCAMENTO CREATE ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/lancamentos?empresa_id=...&mes=YYYY-MM
 * Listar lançamentos de uma empresa
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresa_id = searchParams.get('empresa_id');
    const mes = searchParams.get('mes') || new Date().toISOString().slice(0, 7);

    if (!empresa_id) {
      return NextResponse.json(
        { error: 'empresa_id obrigatório' },
        { status: 400 }
      );
    }

    // Buscar lançamentos
    const lancamentos = await supabaseGet(
      `lancamentos?empresa_id=eq.${empresa_id}&mes_referencia=eq.${mes}&select=*&order=created_at.desc`
    );

    // Agrupar por tipo
    const por_tipo = lancamentos.reduce((acc: any, l: any) => {
      if (!acc[l.tipo]) acc[l.tipo] = [];
      acc[l.tipo].push(l);
      return acc;
    }, {});

    // Calcular totais
    const totais = Object.entries(por_tipo).reduce((acc: any, [tipo, items]: any) => {
      acc[tipo] = items.reduce((sum: number, item: any) => sum + parseFloat(item.valor), 0).toFixed(2);
      return acc;
    }, {});

    return NextResponse.json({
      empresa_id,
      mes,
      total_lancamentos: lancamentos.length,
      lancamentos,
      por_tipo,
      totais,
    });
  } catch (err: any) {
    console.error('LANCAMENTO GET ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
