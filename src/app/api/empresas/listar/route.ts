import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/empresas/listar
 * 
 * Lista todas as empresas com seus dados principais
 * Útil para debug e configuração
 */
export async function GET() {
  try {
    const { data: empresas, error } = await supabase
      .from('empresas')
      .select('id, razao_social, nome_fantasia, cnpj, numero_whatsapp_zapi, status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      total: empresas?.length || 0,
      empresas: empresas || [],
    });
  } catch (err) {
    console.error('Erro ao listar empresas:', err);
    return NextResponse.json(
      { error: 'Erro ao buscar empresas' },
      { status: 500 }
    );
  }
}
