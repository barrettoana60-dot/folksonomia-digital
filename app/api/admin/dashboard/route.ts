import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function safeCount(table: string, filter?: { col: string; val: string }): Promise<number> {
  try {
    let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = q.eq(filter.col, filter.val);
    const { count, error } = await q;
    if (error) return 0;
    return count || 0;
  } catch { return 0; }
}

async function safeSelect(table: string, select: string, opts?: { order?: string; limit?: number }) {
  try {
    let q = supabaseAdmin.from(table).select(select);
    if (opts?.order) q = q.order(opts.order, { ascending: false });
    if (opts?.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  // SEM auth guard — a página admin já é protegida pelo login localStorage
  try {
    // 1. Contar dados reais
    const [obrasCount, tagsCount, nucleosCount, validadosCount, fontesCount] = await Promise.all([
      safeCount('obras'),
      safeCount('tags'),
      safeCount('nucleos'),
      safeCount('nucleos', { col: 'status_validacao', val: 'validado' }),
      safeCount('resultados_externos')
    ]);

    // Contar usuários únicos pelo hash de visitante na tabela tags
    const visitantesData = await safeSelect('tags', 'visitante_hash', { limit: 500 });
    const uniqueVisitors = new Set(visitantesData.map((t: any) => t.visitante_hash).filter(Boolean));

    const totalDados = (obrasCount) + (tagsCount) + (nucleosCount) + (fontesCount);

    // 2. Fluxo Temporal — agrupar tags por dia da semana
    const temporalTags = await safeSelect('tags', 'criado_em', { order: 'criado_em', limit: 500 });
    const tagsPorDia = [0, 0, 0, 0, 0, 0, 0];
    
    temporalTags.forEach((tag: any) => {
      if (!tag.criado_em) return;
      const date = new Date(tag.criado_em);
      tagsPorDia[date.getDay()]++;
    });

    // 3. Tags recentes com grupos temáticos
    const gruposData = await safeSelect('tags', 'id, tag_original, tag_normalizada, grupo_tematico, criado_em', { order: 'criado_em', limit: 100 });
    const gruposCount: Record<string, number> = {};
    const recentTagsMap = new Map<string, any>();

    let detectTagFamily: any = null;
    let normalizeForComparison: any = null;
    try {
      const mod = await import('@/lib/ml/tag-correlator');
      detectTagFamily = mod.detectTagFamily;
      normalizeForComparison = mod.normalizeForComparison;
    } catch {}

    gruposData.forEach((g: any) => {
      const norm = normalizeForComparison ? normalizeForComparison(g.tag_original) : g.tag_original.toLowerCase().trim();
      
      let grupoName = g.grupo_tematico || 'Outros';
      if (detectTagFamily) {
        const family = detectTagFamily(g.tag_original);
        if (family) grupoName = family.name;
      }
      
      gruposCount[grupoName] = (gruposCount[grupoName] || 0) + 1;
      
      if (!recentTagsMap.has(norm) && recentTagsMap.size < 50) {
        recentTagsMap.set(norm, {
          id: g.id,
          tag: g.tag_original,
          grupo: grupoName
        });
      }
    });

    const recentTags = Array.from(recentTagsMap.values());

    const topConceitos = Object.entries(gruposCount)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);

    // 4. Dados de validação
    const pendingNucleos = await safeSelect('nucleos', 'id, conteudo_original, confianca, novidade, tensao, status_validacao', { order: 'created_at', limit: 20 });

    return NextResponse.json({
      success: true,
      data: {
        visaoGeral: {
          obras: obrasCount,
          usuarios: uniqueVisitors.size,
          tags: tagsCount,
          validados: validadosCount,
          totalDados,
          fontesExternas: fontesCount
        },
        relatorioSemantico: {
          fluxoTemporal: tagsPorDia,
          topConceitos,
          recentTags
        },
        validacao: {
          pendentes: pendingNucleos.filter((n: any) => n.status_validacao === 'bruto' || n.status_validacao === 'em_analise'),
          total: pendingNucleos.length
        }
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Erro na API de Dashboard:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
