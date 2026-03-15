import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get('to') || 'delivered@resend.dev';

  const { data, error } = await resend.emails.send({
    from: 'VOIMA Compras <onboarding@resend.dev>',
    to,
    subject: 'Teste VOIMA - Email funcionando!',
    html: '<h2>✅ Email funcionando!</h2><p>Resend configurado com sucesso no VOIMA.</p>',
  });

  if (error) {
    return NextResponse.json({ sucesso: false, erro: error }, { status: 500 });
  }

  return NextResponse.json({ sucesso: true, id: data?.id });
}
