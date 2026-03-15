import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { empresa_id, input_tokens, output_tokens } = await request.json();

    if (!empresa_id || !input_tokens || !output_tokens) {
      return NextResponse.json(
        { error: 'empresa_id, input_tokens, output_tokens obrigatórios' },
        { status: 400 }
      );
    }

    const totalTokens = input_tokens + output_tokens;
    const custo_total = (input_tokens * 0.000004) + (output_tokens * 0.000020);
    const custo_unitario = totalTokens > 0 ? custo_total / totalTokens : 0;

    console.log('🔍 DEBUG: Tentando registrar tokens');
    console.log('  empresa_id:', empresa_id);
    console.log('  input_tokens:', input_tokens);
    console.log('  output_tokens:', output_tokens);
    console.log('  custo_total:', custo_total);
    console.log('  mes_referencia:', new Date().toISOString().substring(0, 7));

    const response = await fetch(
      SUPABASE_URL + '/rest/v1/tokens_consumidos',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY!,
          'Authorization': 'Bearer ' + SUPABASE_KEY!,
        },
        body: JSON.stringify({
          empresa_id: empresa_id,
          tipo: 'debug_test',
          tokens_usados: totalTokens,
          custo_unitario: custo_unitario,
          custo_total: custo_total,
          meta_dados: {
            model: 'claude-haiku-4-5-20251001',
            input_tokens: input_tokens,
            output_tokens: output_tokens,
            preco_input: 0.000004,
            preco_output: 0.000020,
          },
          mes_referencia: new Date().toISOString().substring(0, 7),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ERRO Supabase:', response.status, errorText);
      return NextResponse.json(
        {
          error: 'Erro ao inserir em Supabase',
          status: response.status,
          detail: errorText,
        },
        { status: 500 }
      );
    }

    const text = await response.text();
    console.log('✅ Response text:', text);
    
    const result = text ? JSON.parse(text) : [];
    console.log('✅ Sucesso! Registro criado:', result);

    return NextResponse.json({
      sucesso: true,
      registro_id: Array.isArray(result) && result.length > 0 ? result[0]?.id : null,
      custo_registrado: custo_total,
      tokens_totais: totalTokens,
    });
  } catch (err: any) {
    console.error('❌ ERRO Exception:', err);
    return NextResponse.json(
      {
        error: 'Erro ao registrar tokens',
        message: err.message,
      },
      { status: 500 }
    );
  }
}
