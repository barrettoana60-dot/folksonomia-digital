import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { requireAdmin } from '@/lib/core/auth-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

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
        ano,
        publicado: true
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
