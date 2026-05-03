import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Visão Geral (Estatísticas Básicas)
    const [
      { count: obrasCount },
      { count: tagsCount },
      { count: nucleosCount },
      { count: ontologiasCount },
      { count: validadosCount },
    ] = await Promise.all([
      supabaseAdmin.from('obras').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('tags').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('nucleos').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('ontologias').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('nucleos').select('*', { count: 'exact', head: true }).eq('status_validacao', 'validado'),
    ]);

    // Calcular usuários únicos (visitantes que deixaram tags)
    const { data: usersData } = await supabaseAdmin.from('tags').select('visitante_hash').not('visitante_hash', 'is', null);
    const uniqueUsers = new Set(usersData?.map(u => u.visitante_hash)).size;

    const totalDados = (obrasCount || 0) + (tagsCount || 0) + (nucleosCount || 0) + (ontologiasCount || 0);

    // 2. Relatório Semântico (Agrupamento Temporal)
    // Para simplificar, agruparemos nos últimos 7 dias em código
    const { data: temporalTags } = await supabaseAdmin.from('tags').select('criado_em').order('criado_em', { ascending: false }).limit(500);
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const tagsPorDia = [0, 0, 0, 0, 0, 0, 0];
    
    temporalTags?.forEach(tag => {
      const date = new Date(tag.criado_em);
      tagsPorDia[date.getDay()]++;
    });

    // 3. Análise de Tags (Conceitos Principais / Grupos Temáticos via ML)
    const { data: gruposData } = await supabaseAdmin.from('tags').select('id, tag_original, criado_em').order('criado_em', { ascending: false }).limit(100);
    const gruposCount: Record<string, number> = {};
    const recentTagsMap = new Map<string, any>(); // Para deduplicar tags
    
    // Importar funções do motor de correlação (já que o arquivo é dynamic)
    const { detectTagFamily, normalizeForComparison } = await import('@/lib/ml/tag-correlator');
    
    gruposData?.forEach(g => {
      // 1. Normalizar para deduplicação (evita mostrar "cubismo" e "Cubismo" como tags separadas)
      const norm = normalizeForComparison(g.tag_original);
      
      // 2. Detectar família via ML
      const family = detectTagFamily(g.tag_original);
      const grupoName = family ? family.name : 'Outros';
      
      // 3. Contabilizar para o top conceitos
      gruposCount[grupoName] = (gruposCount[grupoName] || 0) + 1;
      
      // 4. Adicionar aos recentes (apenas uma versão de cada tag normalizada)
      if (!recentTagsMap.has(norm) && recentTagsMap.size < 12) {
        recentTagsMap.set(norm, {
          id: g.id,
          tag: g.tag_original.toLowerCase(), // Normaliza a visualização
          grupo: grupoName
        });
      }
    });

    const recentTags = Array.from(recentTagsMap.values());

    const topConceitos = Object.entries(gruposCount)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    // Formatar a resposta
    return NextResponse.json({
      success: true,
      data: {
        visaoGeral: {
          obras: obrasCount || 0,
          usuarios: uniqueUsers,
          tags: tagsCount || 0,
          validados: validadosCount || 0,
          totalDados
        },
        relatorioSemantico: {
          fluxoTemporal: tagsPorDia,
          topConceitos,
          recentTags
        }
      }
    });
  } catch (error: any) {
    console.error('Erro na API de Dashboard:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
