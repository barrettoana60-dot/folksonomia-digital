import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { requireAdmin } from '@/lib/core/auth-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {

  try {
    const body = await req.json();
    const { titulo, descricao, imagem_url, artista, ano } = body;

    if (!titulo) {
      return NextResponse.json({ success: false, error: 'O título da obra é obrigatório.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('obras')
      .insert({
        titulo,
        descricao,
        imagem_url,
        artista,
        ano
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Erro ao adicionar obra:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data: obras, error } = await supabaseAdmin
      .from('obras')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Buscar contagem de tags por obra
    const { data: tags } = await supabaseAdmin
      .from('tags')
      .select('obra_id');

    const tagCount: Record<string, number> = {};
    if (tags) {
      for (const t of tags) {
        if (t.obra_id) {
          tagCount[t.obra_id] = (tagCount[t.obra_id] || 0) + 1;
        }
      }
    }

    const obrasComTags = (obras || []).map(obra => ({
      ...obra,
      total_tags: tagCount[obra.id] || 0
    }));

    return NextResponse.json({ success: true, data: obrasComTags });
  } catch (error: any) {
    console.error('Erro ao listar obras:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID obrigatório' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('obras')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao deletar obra:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
