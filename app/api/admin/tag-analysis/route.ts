import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { analyzeTagCorrelations } from '@/lib/ml/tag-correlator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/tag-analysis
 * 
 * Recebe uma tag e executa análise ML completa:
 * - Detecta família temática
 * - Encontra duplicatas (erros ortográficos, variações de case)
 * - Encontra tags semanticamente relacionadas (sinônimos, Jaccard)
 * - Gera sugestões de ação
 */
export async function POST(req: NextRequest) {
  try {
    const { tag } = await req.json();

    if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Tag inválida' }, { status: 400 });
    }

    const tagClean = tag.trim();

    // 1. Buscar TODAS as tags do banco para comparação
    const { data: allTagsData } = await supabaseAdmin
      .from('tags')
      .select('tag_original')
      .limit(500);

    const allTags = [...new Set((allTagsData || []).map(t => t.tag_original).filter(Boolean))];

    // 2. Executar análise ML completa
    const analysis = analyzeTagCorrelations(tagClean, allTags);

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error: any) {
    console.error('Erro na análise de tag:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
