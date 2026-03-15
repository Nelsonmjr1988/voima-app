import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 📊 Armazenar últimas requisições para debug
let webhookLogs: Array<{ timestamp: string; event: string; data: any; status: string }> = [];

const addLog = (event: string, data: any, status: string) => {
  webhookLogs.push({
    timestamp: new Date().toISOString(),
    event,
    data,
    status,
  });
  // Manter apenas últimas 50
  if (webhookLogs.length > 50) webhookLogs.shift();
};

/**
 * POST /api/webhooks/z-api
 * 
 * Webhook para Z-API
 * 
 * **ESTRUTURA Z-API (CORRETO):**
 * {
 *   "instanceId": "3EAADDCE71F5D2C80DAAB2694663CF7D",
 *   "phone": "5564996760460",           // ← QUEM ENVIOU (Silva Engenharia)
 *   "connectedPhone": "5564996750376",  // ← NÚMERO CONECTADO (Voima)
 *   "text": { "message": "Oi" },
 *   "senderName": "Silva",
 *   "type": "ReceivedCallback"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 📊 LOG TUDO
    console.log('🔔 [WEBHOOK Z-API] Payload recebido:', JSON.stringify(body, null, 2));
    addLog('WEBHOOK_RECEIVED', body, 'RECEBIDA');

    // ========================================
    // É uma mensagem de texto recebida?
    // ========================================
    if (body.type !== 'ReceivedCallback') {
      console.log('⚠️ Não é ReceivedCallback, ignorando');
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Ignorar mensagens sem texto
    if (!body.text?.message && !body.image && !body.audio && !body.video && !body.document) {
      console.log('⚠️ Mensagem sem conteúdo, ignorando');
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ========================================
    // Extrair dados
    // ========================================
    const telefoneCliente = body.phone;    // Quem enviou (Silva)
    const numeroZapi = body.connectedPhone; // Número conectado (Voima)
    let mensagem = '';

    if (body.text?.message) {
      mensagem = body.text.message;
    } else if (body.image?.caption) {
      mensagem = `[Imagem] ${body.image.caption || ''}`;
    } else if (body.audio) {
      mensagem = '[Áudio]';
    } else if (body.video?.caption) {
      mensagem = `[Vídeo] ${body.video.caption || ''}`;
    } else if (body.document?.fileName) {
      mensagem = `[Documento] ${body.document.fileName}`;
    }

    const nomeCliente = body.senderName || telefoneCliente;

    console.log(`📨 Mensagem: de ${telefoneCliente} (Silva) → Voima: "${mensagem}"`);
    addLog('MENSAGEM_PROCESSADA', { telefoneCliente, numeroZapi, mensagem }, 'PROCESSANDO');

    // ========================================
    // ETAPA 1: Identificar empresa pelo número que enviou
    // ========================================
    console.log(`🔍 Procurando empresa com numero_whatsapp_zapi = ${telefoneCliente}`);
    const empresaResult = await (supabase as any)
      .from('empresas')
      .select('id, razao_social, nome_fantasia')
      .eq('numero_whatsapp_zapi', telefoneCliente)
      .single();

    const empresa = (empresaResult?.data || null) as any;
    const empresaError = empresaResult?.error;

    if (empresaError || !empresa) {
      console.warn(`⚠️ Nenhuma empresa encontrada para número: ${telefoneCliente}`);
      addLog('EMPRESA_NAO_IDENTIFICADA', { telefoneCliente }, 'ERRO');

      return NextResponse.json(
        { 
          success: true, 
          warning: 'Empresa não identificada',
          numero_recebido: telefoneCliente,
          dica: 'Configure o número no campo numero_whatsapp_zapi da tabela empresas'
        },
        { status: 200 }
      );
    }

    // ========================================
    // ETAPA 2: Empresa identificada! ✅
    // ========================================
    console.log(`✅ Empresa identificada: ${empresa.razao_social} (${empresa.id})`);

    // ========================================
    // ETAPA 3: Salvar mensagem no histórico
    // ========================================
    const { error: saveError } = await (supabase as any)
      .from('whatsapp_mensagens')
      .insert({
        empresa_id: empresa.id,
        telefone_cliente: telefoneCliente,
        mensagem: mensagem,
        tipo: 'entrada',
        timestamp: new Date(),
        metadata: {
          nome_cliente: nomeCliente,
          numero_zapi: numeroZapi,
          message_id: body.messageId,
        },
      });

    if (saveError) {
      console.error('❌ Erro ao salvar mensagem:', saveError);
      addLog('ERRO_SALVAR', saveError, 'ERRO');
    } else {
      console.log(`💾 Mensagem salva no histórico (empresa: ${empresa.id})`);
      addLog('MENSAGEM_SALVA', { empresa_id: empresa.id }, 'SUCESSO');
    }

    // ========================================
    // ETAPA 4: Chamar agent para processar 🤖
    // ========================================
    console.log(`🤖 Chamando agent para processar...`);

    try {
      const agentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/agent/respond`;
      
      const agentResponse = await fetch(agentUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: empresa.id,
          telefone_cliente: telefoneCliente,
          mensagem: mensagem,
        }),
      });

      const agentResult = await agentResponse.json();

      if (agentResult?.success) {
        console.log(`✅ Agent processou com sucesso`);
        addLog('AGENT_SUCESSO', agentResult, 'SUCESSO');
      } else {
        console.error(`⚠️ Agent não gerou resposta`, agentResult);
        addLog('AGENT_ERRO', agentResult, 'ERRO');
      }
    } catch (agentErr) {
      console.error(`❌ Erro ao chamar agent:`, agentErr);
      addLog('AGENT_EXCEPTION', agentErr, 'ERRO');
    }

    return NextResponse.json(
      {
        success: true,
        empresa_id: empresa.id,
        empresa_nome: empresa.razao_social,
        mensagem_recebida: true,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    addLog('WEBHOOK_ERRO', error, 'ERRO');

    // Sempre retornar 200 para Z-API saber que recebemos
    return NextResponse.json(
      { success: true, error_logged: true },
      { status: 200 }
    );
  }
}

/**
 * GET /api/webhooks/z-api
 * Retorna status e logs do webhook
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'webhook_ativo',
      timestamp: new Date(),
      total_logs: webhookLogs.length,
      logs: webhookLogs,
    },
    { status: 200 }
  );
}

/**
 * Capturar outros métodos HTTP para debug
 */
export async function PATCH(request: NextRequest) {
  console.log('⚠️ [WEBHOOK] PATCH recebido');
  addLog('PATCH', await request.json().catch(() => ({})), 'RECEBIDA');
  return NextResponse.json({ success: true }, { status: 200 });
}

export async function PUT(request: NextRequest) {
  console.log('⚠️ [WEBHOOK] PUT recebido');
  addLog('PUT', await request.json().catch(() => ({})), 'RECEBIDA');
  return NextResponse.json({ success: true }, { status: 200 });
}

export async function OPTIONS() {
  console.log('⚠️ [WEBHOOK] OPTIONS recebido (CORS preflight)');
  addLog('OPTIONS', {}, 'RECEBIDA');
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
