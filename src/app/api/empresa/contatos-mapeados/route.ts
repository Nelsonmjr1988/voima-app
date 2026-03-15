import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/empresa/contatos-mapeados
 * Listar contatos mapeados de uma empresa
 */
export async function GET(request: NextRequest) {
  try {
    const empresaId = request.nextUrl.searchParams.get('empresa_id');
    const ativo = request.nextUrl.searchParams.get('ativo');

    if (!empresaId) {
      return NextResponse.json(
        { erro: 'empresa_id é obrigatório' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('empresa_contatos_mapeamento')
      .select('*')
      .eq('empresa_id', empresaId);

    if (ativo !== null) {
      query = query.eq('ativo', ativo === 'true');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar contatos:', error);
      return NextResponse.json(
        { erro: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      total: data?.length || 0,
      contatos: data,
    });
  } catch (erro: any) {
    console.error('❌ Erro:', erro);
    return NextResponse.json(
      { erro: erro.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/empresa/contatos-mapeados
 * Adicionar novo contato mapeado
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empresa_id, telefone_contato, nome_contato, tipo_contato } = body;

    if (!empresa_id || !telefone_contato) {
      return NextResponse.json(
        { erro: 'empresa_id e telefone_contato são obrigatórios' },
        { status: 400 }
      );
    }

    // Normalizar telefone
    const telefoneLimpo = telefone_contato.replace(/\D/g, '');
    if (!telefoneLimpo || telefoneLimpo.length < 10) {
      return NextResponse.json(
        { erro: 'Telefone inválido' },
        { status: 400 }
      );
    }

    // Verificar se empresa existe
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id')
      .eq('id', empresa_id)
      .single();

    if (empresaError || !empresa) {
      return NextResponse.json(
        { erro: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    // Inserir novo contato
    const { data, error } = await (supabase
      .from('empresa_contatos_mapeamento' as any)
      .insert({
        empresa_id,
        telefone_contato: telefoneLimpo,
        nome_contato,
        tipo_contato: tipo_contato || 'cliente',
        ativo: true,
      } as any)
      .select()
      .single() as any);

    if (error) {
      console.error('Erro ao inserir:', error);
      
      // Verifica se é violação de unique constraint
      if (error.message.includes('unique')) {
        return NextResponse.json(
          { erro: 'Esse telefone já está mapeado para outra empresa' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { erro: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Contato ${telefone_contato} adicionado à empresa ${empresa_id}`);

    return NextResponse.json({
      sucesso: true,
      contato: data,
    });
  } catch (erro: any) {
    console.error('❌ Erro:', erro);
    return NextResponse.json(
      { erro: erro.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/empresa/contatos-mapeados
 * Atualizar contato mapeado
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nome_contato, tipo_contato, ativo } = body;

    if (!id) {
      return NextResponse.json(
        { erro: 'id é obrigatório' },
        { status: 400 }
      );
    }

    const { data, error } = await (supabase
      .from('empresa_contatos_mapeamento')
      .update({ nome_contato, tipo_contato, ativo } as any)
      .eq('id', id)
      .select()
      .single() as any);

    if (error) {
      console.error('Erro ao atualizar:', error);
      return NextResponse.json(
        { erro: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Contato ${id} atualizado`);

    return NextResponse.json({
      sucesso: true,
      contato: data,
    });
  } catch (erro: any) {
    console.error('❌ Erro:', erro);
    return NextResponse.json(
      { erro: erro.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/empresa/contatos-mapeados
 * Deletar contato mapeado (soft delete - apenas desativa)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { erro: 'id é obrigatório' },
        { status: 400 }
      );
    }

    // Soft delete - apenas desativa
    const { data, error } = await supabase
      .from('empresa_contatos_mapeamento')
      .update({ ativo: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao deletar:', error);
      return NextResponse.json(
        { erro: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Contato ${id} desativado`);

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Contato desativado',
      contato: data,
    });
  } catch (erro: any) {
    console.error('❌ Erro:', erro);
    return NextResponse.json(
      { erro: erro.message },
      { status: 500 }
    );
  }
}
