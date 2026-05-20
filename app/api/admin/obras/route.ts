import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { titulo, descricao, imagem_url, artista, ano } = body;

    if (!titulo) {
      return NextResponse.json({ success: false, error: 'O título da obra é obrigatório.' }, { status: 400 });
    }

    // Tentar com admin primeiro, fallback para client público
    let result = await supabaseAdmin
      .from('obras')
      .insert({ titulo, descricao, imagem_url, artista, ano })
      .select()
      .single();

    if (result.error) {
      console.error('[POST obras] supabaseAdmin falhou, tentando supabaseClient:', result.error.message);
      result = await supabaseClient
        .from('obras')
        .insert({ titulo, descricao, imagem_url, artista, ano })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error('[POST obras] Erro final:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('[GET obras] Buscando obras...');
    console.log('[GET obras] SERVICE_ROLE_KEY configurada:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Tentar com admin
    let obrasResult = await supabaseAdmin
      .from('obras')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('[GET obras] Admin result - error:', obrasResult.error?.message, 'count:', obrasResult.data?.length);

    // Se admin retornou vazio ou erro, tentar com client público
    if (obrasResult.error || !obrasResult.data || obrasResult.data.length === 0) {
      console.log('[GET obras] Admin vazio/erro, tentando supabaseClient...');
      const clientResult = await supabaseClient
        .from('obras')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('[GET obras] Client result - error:', clientResult.error?.message, 'count:', clientResult.data?.length);

      if (clientResult.data && clientResult.data.length > 0) {
        obrasResult = clientResult;
      }
    }

    const obras = obrasResult.data || [];

    // Buscar contagem de tags por obra
    let tagsData: any[] = [];
    const tagsResult = await supabaseAdmin.from('tags').select('obra_id');
    if (tagsResult.data && tagsResult.data.length > 0) {
      tagsData = tagsResult.data;
    } else {
      const tagsClient = await supabaseClient.from('tags').select('obra_id');
      tagsData = tagsClient.data || [];
    }

    const tagCount: Record<string, number> = {};
    for (const t of tagsData) {
      if (t.obra_id) {
        tagCount[t.obra_id] = (tagCount[t.obra_id] || 0) + 1;
      }
    }

    const obrasComTags = obras.map((obra: any) => ({
      ...obra,
      total_tags: tagCount[obra.id] || 0
    }));

    console.log('[GET obras] Retornando', obrasComTags.length, 'obras');
    return NextResponse.json({ success: true, data: obrasComTags, debug: { serviceKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY, total: obrasComTags.length } });
  } catch (error: any) {
    console.error('[GET obras] Erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID obrigatório' }, { status: 400 });
    }

    let result = await supabaseAdmin.from('obras').delete().eq('id', id);
    if (result.error) {
      result = await supabaseClient.from('obras').delete().eq('id', id);
    }
    if (result.error) throw result.error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE obras] Erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
