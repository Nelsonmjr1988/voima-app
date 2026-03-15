import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email_teste } = body;

    if (!email_teste) {
      return NextResponse.json(
        { error: 'email_teste é obrigatório' },
        { status: 400 }
      );
    }

    // Simular envio de email assincronamente
    console.log(`[LOG] Testando envio para: ${email_teste}`);

    // Retornar resposta imediatamente
    return NextResponse.json({
      status: 'ok',
      mensagem: 'Teste de email iniciado',
      email: email_teste,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Erro no teste:', err);
    return NextResponse.json(
      { error: err.message || 'Erro no teste' },
      { status: 500 }
    );
  }
}
