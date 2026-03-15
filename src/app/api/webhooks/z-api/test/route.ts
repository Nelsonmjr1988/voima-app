import { NextResponse } from 'next/server';

/**
 * GET /api/webhooks/z-api/test
 * Simula Z-API enviando uma mensagem de teste
 * 
 * Usa curl assim:
 * curl http://localhost:3004/api/webhooks/z-api/test
 */
export async function GET() {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004';
    
    console.log(`🧪 Simulando webhook Z-API...`);

    // Simular payload real que Z-API enviaria
    const payload = {
      instanceId: process.env.Z_API_INSTANCE_ID || 'TEST_INSTANCE',
      phone: '5564996760460',           // Silva Engenharia
      connectedPhone: '5564996750376',  // Voima
      text: {
        message: '🧪 MENSAGEM DE TESTE - Ignore se vir isso duplicado',
      },
      senderName: 'Silva Engenharia (TESTE)',
      messageId: `TEST_${Date.now()}`,
      momment: Date.now(),
      type: 'ReceivedCallback',
      fromMe: false,
      status: 'RECEIVED',
      isGroup: false,
    };

    console.log('📤 Enviando para webhook:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${appUrl}/api/webhooks/z-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    console.log('✅ Resposta webhook:', JSON.stringify(result, null, 2));

    return NextResponse.json(
      {
        success: true,
        mensagem: 'Teste enviado para webhook',
        payload,
        resposta: result,
        verificar_logs: `${appUrl}/api/webhooks/z-api`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Erro ao testar webhook:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
