import { NextRequest, NextResponse } from 'next/server';
import { inicializarZApi } from '@/lib/z-api-whatsapp';

/**
 * GET /api/whatsapp/instance-info
 * Obter informações da instância Z-API (status, QR code, etc)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Consultando informações da instância Z-API');

    // Inicializar Z-API
    const zapi = inicializarZApi();

    // Buscar status da instância
    const info = await zapi.obterStatusInstancia();

    if (!info) {
      console.warn('⚠️ Não foi possível obter informações da instância');
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Não foi possível conectar à Z-API',
          instance_id: process.env.Z_API_INSTANCE_ID,
        },
        { status: 503 }
      );
    }

    console.log('✅ Informações da instância obtidas');

    return NextResponse.json({
      sucesso: true,
      instance_id: process.env.Z_API_INSTANCE_ID,
      status: info.status || info.type || 'unknown',
      conectado: info.status === 'connected' || info.connected === true,
      qrcode: info.qr || info.qrcode,
      numero: info.number || info.phone,
      detalhes: info,
    });
  } catch (erro: any) {
    console.error('❌ Erro ao obter informações:', erro);
    return NextResponse.json(
      {
        sucesso: false,
        erro: erro.message || 'Erro interno do servidor',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/instance-info
 * Desconectar instância
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { acao } = body;

    if (acao === 'desconectar') {
      console.log('🔴 Desconectando instância Z-API');

      const zapi = inicializarZApi();
      const desconectou = await zapi.desconectar();

      return NextResponse.json({
        sucesso: desconectou,
        acao: 'desconectar',
        mensaje: desconectou ? 'Instância desconectada' : 'Erro ao desconectar',
      });
    }

    return NextResponse.json(
      { erro: 'Ação não reconhecida' },
      { status: 400 }
    );
  } catch (erro: any) {
    console.error('❌ Erro:', erro);
    return NextResponse.json(
      { erro: erro.message },
      { status: 500 }
    );
  }
}
