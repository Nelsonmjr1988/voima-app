import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function supabaseInsert(table: string, data: any) {
  console.log(`[TEST] Tentando inserir em ${table}:`, JSON.stringify(data));
  
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });

  console.log(`[TEST] Status HTTP: ${res.status}`);
  const text = await res.text();
  console.log(`[TEST] Response text: ${text}`);

  if (!res.ok) {
    throw new Error(`INSERT failed: ${text}`);
  }

  if (!text) return {};
  return JSON.parse(text);
}

export async function GET(request: NextRequest) {
  try {
    const pedido_id = '24dde8e0-d511-4135-887e-9565c29af6f5';
    const fornecedor_id = 'bb53f193-5d28-45ab-8ff9-a82fa1bc1f1e';

    console.log('[TEST] Iniciando teste de criação de OC');

    const ocData = {
      pedido_compra_id: pedido_id,
      fornecedor_id: fornecedor_id,
      empresa_id: '85b50c5c-abf2-4bed-9854-a15fb0d60d2b',
      obra_id: '926f3c00-9405-4850-81e1-afc4f9729ac1',
      valor_total: 123.45,
      status: 'emitida',
      data_emissao: new Date().toISOString(),
    };

    const result = await supabaseInsert('ordens_compra', ocData);

    console.log('[TEST] Insert successful:', JSON.stringify(result));

    return NextResponse.json({
      sucesso: true,
      resultado: result,
    });

  } catch (err: any) {
    console.error('[TEST] Erro:', err);
    return NextResponse.json({ erro: String(err), stack: err.stack }, { status: 500 });
  }
}
