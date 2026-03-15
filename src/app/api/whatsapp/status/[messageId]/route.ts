import { NextRequest, NextResponse } from 'next/server';
import { inicializarZApi } from '@/lib/z-api-whatsapp';

/**
 * GET /api/whatsapp/status/:messageId
 * Obter status de uma mensagem enviada
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const messageId = params.messageId;

    if (!messageId) {
      return NextResponse.json(
        { erro: 'messageId é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`✓ Consultando status de ${messageId}`);

    // Inicializar Z-API
    const zapi = inicializarZApi();

    // Buscar status
    const status = await zapi.obterStatusMensagem(messageId);

    if (!status) {
      console.warn(`⚠️ Status não encontrado para ${messageId}`);
      return NextResponse.json(
        { erro: 'Mensagem não encontrada' },
        { status: 404 }
      );
    }

    console.log(`✅ Status obtido:`, status);

    return NextResponse.json({
      sucesso: true,
      message_id: messageId,
      status: status.status || status.type || 'unknown',
      detalhes: status,
    });
  } catch (erro: any) {
    console.error('❌ Erro ao obter status:', erro);
    return NextResponse.json(
      { erro: erro.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
