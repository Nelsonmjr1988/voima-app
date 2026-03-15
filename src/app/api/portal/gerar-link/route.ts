import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };

// POST /api/portal/gerar-link  { empresa_id }
export async function POST(request: NextRequest) {
  try {
    const { empresa_id } = await request.json();
    if (!empresa_id) return NextResponse.json({ error: 'empresa_id obrigatório' }, { status: 400 });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/empresas?id=eq.${empresa_id}&select=id,nome_fantasia`, { headers: H });
    const empresas = await res.json();
    if (!empresas?.length) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

    const salt = Math.random().toString(36).slice(2, 10);
    const raw = `${empresa_id}|${Date.now()}|${salt}`;
    const token = Buffer.from(raw).toString('base64url');

    const baseUrl = request.nextUrl.origin;
    return NextResponse.json({
      empresa: empresas[0].nome_fantasia,
      token,
      url: `${baseUrl}/portal?token=${token}&empresa=${empresa_id}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
