import { NextResponse } from 'next/server';

/**
 * GET /api/z-api/status
 * Verifica status da instância Z-API
 */
export async function GET() {
  try {
    const instanceId = process.env.Z_API_INSTANCE_ID;
    const token = process.env.Z_API_TOKEN;

    if (!instanceId || !token) {
      return NextResponse.json(
        { error: 'Z-API credentials not configured' },
        { status: 400 }
      );
    }

    console.log(`🔍 Checando status da instância Z-API: ${instanceId}`);

    const response = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/get-instance`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();

    console.log('📊 Z-API Status:', JSON.stringify(result, null, 2));

    if (response.ok && result?.instanceData) {
      return NextResponse.json(
        {
          ativo: true,
          instancia: result.instanceData?.name || 'Desconhecido',
          numero: result.instanceData?.connected_number || 'Não conectado',
          status: result.instanceData?.status || 'unknown',
          webhook_url: result.instanceData?.webhook_url,
          timestamp: new Date(),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ativo: false,
        error: result?.message || 'Erro desconhecido',
        result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Erro ao verificar status Z-API:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
