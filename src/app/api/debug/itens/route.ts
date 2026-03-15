import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pcId = searchParams.get('pc_id');

  if (!pcId) {
    return NextResponse.json({ error: 'pc_id é obrigatório' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/itens_pedido_compra?pedido_compra_id=eq.${pcId}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: await res.text() }, { status: res.status });
    }

    const itens = await res.json();
    return NextResponse.json({ total: itens.length, itens });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
