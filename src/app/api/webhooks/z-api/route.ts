import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/webhooks/z-api
 * 
 * Webhook SIMPLIFICADO:
 * 1. Recebe mensagem WhatsApp
 * 2. Identifica qual empresa pelo número_whatsapp_zapi
 * 3. Passa empresa_id pro agent
 * 4. Salva no histórico
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    console.log('🔔 Webhook Z-API recebido:', event);

    // ========================================
    // EVENTO: Nova mensagem recebida
    // ========================================
    if (event === 'MESSAGES_UPSERT' || event === 'message' || event === 'MESSAGE') {
      const telefoneCliente = data.from || data.sender;
      const mensagem = data.message || '';
      const nomeCliente = data.senderName || telefoneCliente;
      
      // 🔑 IMPORTANTE: De qual número (empresa) chegou a mensagem?
      const numeroEmpresa = data.from;

      console.log(`📨 Mensagem de ${telefoneCliente} para Voima: "${mensagem}"`);

      // ========================================
      // ETAPA 1: Identificar empresa pelo número dela (5564996760460 = Silva, etc)
      // ========================================
      const empresaResult = await (supabase as any)
        .from('empresas')
        .select('id, razao_social, nome_fantasia')
        .eq('numero_whatsapp_zapi', numeroEmpresa)
        .single();

      const empresa = (empresaResult?.data || null) as any;
      const empresaError = empresaResult?.error;

      if (empresaError || !empresa) {
        console.warn(`⚠️ Nenhuma empresa encontrada para número: ${numeroEmpresa}`);

        return NextResponse.json(
          { 
            success: true, 
            warning: 'Empresa não identificada',
            numero_recebido: numeroEmpresa,
            dica: 'Configure o número no campo numero_whatsapp_zapi da tabela empresas'
          },
          { status: 200 }
        );
      }

      // ========================================
      // ETAPA 2: Empresa identificada! ✅
      // ========================================
      console.log(
        `✅ Empresa identificada: ${empresa.razao_social} (${empresa.id})`
      );

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
            numero_empresa: numeroEmpresa,
          },
        });

      if (saveError) {
        console.error('❌ Erro ao salvar mensagem:', saveError);
      } else {
        console.log(`💾 Mensagem salva no histórico (empresa: ${empresa.id})`);
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

        if (agentResult.success && agentResult.resposta) {
          console.log(`✅ Agent gerou resposta: ${agentResult.resposta}`);

          // ========================================
          // ETAPA 5: Enviar resposta de volta via Z-API
          // ========================================
          console.log(`📤 Enviando resposta via Z-API...`);

          try {
            const zapiUrl = 'https://api.z-api.io/instances/' +
              process.env.Z_API_INSTANCE_ID +
              '/token/' +
              process.env.Z_API_TOKEN +
              '/send-text';

            const zapiResponse = await fetch(zapiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: telefoneCliente,
                message: agentResult.resposta,
              }),
            });

            const zapiResult = await zapiResponse.json();

            if (zapiResponse.ok) {
              console.log(`✅ Resposta enviada com sucesso!`);
            } else {
              console.error(`⚠️ Erro ao enviar via Z-API:`, zapiResult);
            }
          } catch (zapiErr) {
            console.error(`❌ Erro Z-API:`, zapiErr);
          }
        } else {
          console.error(`⚠️ Agent não gerou resposta`, agentResult);
        }
      } catch (agentErr) {
        console.error(`❌ Erro ao chamar agent:`, agentErr);
      }

      return NextResponse.json(
        {
          success: true,
          empresa_id: empresa.id,
          empresa_nome: empresa.razao_social,
          mensagem_recebida: true,
          processada_pelo_agent: true,
        },
        { status: 200 }
      );
    }

    // ========================================
    // EVENTO: Status de entrega/leitura
    // ========================================
    if (event === 'MESSAGES_UPDATE' || event === 'message_status') {
      const status = data.status || 'unknown';
      const messageId = data.id;

      console.log(`📌 Status de mensagem ${messageId}: ${status}`);

      return NextResponse.json(
        { success: true, status_updated: true },
        { status: 200 }
      );
    }

    // ========================================
    // EVENTO: Instância conectada
    // ========================================
    if (event === 'INSTANCE_CONNECTED' || event === 'connected') {
      const numeroWhatsapp = data.phone || data.number;

      console.log(`🟢 WhatsApp conectado: ${numeroWhatsapp}`);

      // Salvar status
      await (supabase as any).from('zapi_instance_status').upsert({
        instance_id: process.env.Z_API_INSTANCE_ID,
        status: 'connected',
        numero_whatsapp: numeroWhatsapp,
        last_update: new Date(),
        updated_at: new Date(),
      });

      return NextResponse.json(
        { success: true, connected: true },
        { status: 200 }
      );
    }

    // ========================================
    // EVENTO: Instância desconectada
    // ========================================
    if (event === 'INSTANCE_DISCONNECTED' || event === 'disconnected') {
      console.log('🔴 WhatsApp desconectado');

      await (supabase as any).from('zapi_instance_status').upsert({
        instance_id: process.env.Z_API_INSTANCE_ID,
        status: 'disconnected',
        last_update: new Date(),
        updated_at: new Date(),
      });

      return NextResponse.json(
        { success: true, disconnected: true },
        { status: 200 }
      );
    }

    // Evento desconhecido - log e retorna 200
    console.log('⚠️ Evento desconhecido:', event, data);
    return NextResponse.json(
      { success: true, event_logged: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Erro no webhook:', error);

    // Sempre retornar 200 para Z-API saber que recebemos
    return NextResponse.json(
      { success: true, error_logged: true },
      { status: 200 }
    );
  }
}

/**
 * GET /api/webhooks/z-api
 * Retorna status do webhook
 */
export async function GET() {
  return NextResponse.json({
    status: 'webhook_ativo',
    timestamp: new Date(),
  });
}
