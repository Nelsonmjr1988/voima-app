import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Testar se consegue buscar uma cotação
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/cotacoes?id=eq.1a4a97b6-82c2-4e50-8fd1-d33cf1ee5ac9&select=id,item_pedido_id,fornecedor_id`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    );

    if (!res.ok) {
      return NextResponse.json({
        error: 'Erro ao buscar cotação',
        status: res.status,
        details: await res.text()
      }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      sucesso: true,
      cotacoes_encontradas: data.length,
      primeira_cotacao: data[0],
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: err.message,
      stack: err.stack
    }, { status: 500 });
  }
}
