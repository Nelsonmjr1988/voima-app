import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };

export async function POST(request: NextRequest) {
  try {
    const { pedido_id } = await request.json();
    if (!pedido_id) return NextResponse.json({ error: 'pedido_id obrigatório' }, { status: 400 });

    const check = await fetch(`${SUPABASE_URL}/rest/v1/pedidos_compra?id=eq.${pedido_id}&select=id,status,codigo`, { headers: H });
    const pedidos = await check.json();
    if (!pedidos?.length) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    const pedido = pedidos[0];
    if (!['aguardando_aprovacao', 'rascunho'].includes(pedido.status)) {
      return NextResponse.json({ error: `Pedido já está com status: ${pedido.status}` }, { status: 400 });
    }

    await fetch(`${SUPABASE_URL}/rest/v1/pedidos_compra?id=eq.${pedido_id}`, {
      method: 'PATCH',
      headers: H,
      body: JSON.stringify({ status: 'aprovado', data_aprovacao: new Date().toISOString(), updated_at: new Date().toISOString() }),
    });

    return NextResponse.json({ mensagem: `Pedido ${pedido.codigo} aprovado!`, pedido_codigo: pedido.codigo });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
