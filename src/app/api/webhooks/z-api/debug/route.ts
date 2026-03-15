import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/webhooks/z-api/debug
 * 
 * Verifica o status do webhook e da empresa
 */
export async function GET() {
  try {
    // Verificar tabelas
    const { data: tableCheck } = await supabase
      .from('whatsapp_mensagens')
      .select('count', { count: 'exact' });

    const { data: empresas } = await supabase
      .from('empresas')
      .select('id, razao_social, numero_whatsapp_zapi')
      .not('numero_whatsapp_zapi', 'is', null);

    const { data: mensagens } = await supabase
      .from('whatsapp_mensagens')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(5);

    const { data: status } = await supabase
      .from('zapi_instance_status')
      .select('*');

    return NextResponse.json({
      webhook_status: 'ativo',
      tabelas: {
        whatsapp_mensagens_existem: !!tableCheck,
      },
      empresas_configuradas: empresas || [],
      ultimas_mensagens: mensagens || [],
      zapi_status: status || [],
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Debug error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
