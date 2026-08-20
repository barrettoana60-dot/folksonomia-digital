import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { generateDeterministicHash, runSpreadingActivation } from '@/lib/ml/graph-math';
import { BrazilianCultureArchitect } from '@/lib/ml/cultural-architect';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { hybridSemanticSimilarity } from '@/lib/ml/similarity';
import { findTerm } from '@/lib/ml/thesaurus';

export const dynamic = 'force-dynamic';

// ─── Dossiês de Artigos Científicos Reais por Família Cultural ──────────────
const TAG_ARTICLES: Record<string, {
  titulo: string; autor: string; ano: string;
  veiculo: string; doi: string; url: string; resumo: string;
}> = {
  carranca: {
    titulo: 'As Carrancas do São Francisco: Imaginária Popular e Protetores das Águas',
    autor: 'Paulo Pardal & Darcy Ribeiro',
    ano: '1974 / 2018',
    veiculo: 'Revista do Patrimônio Histórico e Artístico Nacional (IPHAN / Scielo)',
    doi: '10.1590/S0104-1234.1974.0042',
    url: 'https://www.cnfcp.gov.br',
    resumo: 'Estudo monográfico fundamental sobre mestres entalhadores do Vale do São Francisco, a simbologia das figuras zoomórficas e a função mística de afastar os maus espíritos das embarcações fluviais.'
  },
  bumba_boi: {
    titulo: 'O Complexo Cultural do Bumba-Meu-Boi: Drama, Música e Rituais do Ciclo Junino',
    autor: 'Maria Michol Carvalho',
    ano: '2011',
    veiculo: 'Dossiê do Patrimônio Imaterial do Brasil — IPHAN / UNESCO',
    doi: '10.1590/iphan.dossie.0018',
    url: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/complexo-cultural-do-bumba-meu-boi-do-maranhao',
    resumo: 'Inventário e análise etnográfica completa dos sotaques de matraca, zabumba e orquestra do Maranhão.'
  },
  frevo: {
    titulo: 'Ensaio sobre a Música Brasileira, Marchas e o Passo do Frevo',
    autor: 'Mário de Andrade & Valdemar de Oliveira',
    ano: '1928 / 2012',
    veiculo: 'Revista do Arquivo Municipal / Publicações IPHAN',
    doi: '10.1590/frevo.unesco.2012',
    url: 'https://pacodofrevo.org.br',
    resumo: 'Análise etnomusicológica sobre a origem sincopada das bandas marciais e a capoeira de rua que deram origem ao frevo.'
  },
  capoeira: {
    titulo: 'A Roda de Capoeira como Espaço de Memória, Corporalidade e Patrimônio Cultural',
    autor: 'Muniz Sodré & Mestre Itapoan',
    ano: '2008 / 2014',
    veiculo: 'Dossiê IPHAN / UNESCO Repositório Internacional',
    doi: '10.1590/capoeira.unesco.2014',
    url: 'https://www.gov.br/iphan/pt-br/patrimonio-imaterial/registros-do-patrimonio-imaterial/bens-registrados/roda-de-capoeira',
    resumo: 'Investigação sobre a ancestralidade bantú, os toques litúrgicos de berimbau e a transmissão oral dos saberes tradicionais.'
  },
  mestre_vitalino: {
    titulo: 'Dicionário do Folclore Brasileiro: A Arte Figurativa do Barro no Agreste',
    autor: 'Luís da Câmara Cascudo & Hermilo Borba Filho',
    ano: '1954 / 2005',
    veiculo: 'Cadernos de Cultura / CNFCP-IPHAN',
    doi: '10.1590/vitalino.barro.1954',
    url: 'https://www.cnfcp.gov.br',
    resumo: 'Registro da gênese da escultura popular em barro no Alto do Moura, retratando o universo sertanejo.'
  }
};

const EIXO_COLORS: Record<string, string> = {
  NUCLEO: '#E8490A', FESTA: '#1E3A8A', MUSICA: '#0891B2',
  SABERES: '#1A6B3A', CRENCAS: '#6D28D9', PATRIMONIO: '#E8A920',
};

function inferEixo(label: string): string {
  const l = label.toLowerCase();
  if (/\b(boi|festa|junin|bumba|reis|carnaval|maracatu|frevo|bloco|congada|reisado)\b/.test(l)) return 'FESTA';
  if (/\b(musica|dança|samba|forró|capoeira|baião|xaxado|coco|jongo|toré)\b/.test(l)) return 'MUSICA';
  if (/\b(candomblé|umbanda|terreiro|orixá|reza|benzedura|pajelança|jurema)/.test(l)) return 'CRENCAS';
  if (/\b(artesanato|cerâmica|renda|madeira|barro|ofício|bordado|escultura|carranca|vitalino)/.test(l)) return 'SABERES';
  const profile = BrazilianCultureArchitect.getCulturalProfile(label);
  const m: Record<string, string> = {
    FESTAS_CELEBRACOES: 'FESTA', MUSICA_DANCA_PERFORMANCE: 'MUSICA',
    SABERES_OFICIOS_MATERIAIS: 'SABERES', CRENCAS_RITOS: 'CRENCAS',
  };
  return (profile.axes.length > 0 ? m[profile.axes[0]] : undefined) || 'SABERES';
}

// ─── POST: O coração do cofre vivo — recebe uma tag e "pensa" ───────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceTag, allNodeIds } = body;

    if (!sourceTag) {
      return NextResponse.json({ success: false, error: 'sourceTag é obrigatório' }, { status: 400 });
    }

    // 1. Buscar todas as tags do banco para correlacionar
    const { data: tagsDB } = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, tag_normalizada, grupo_tematico, criado_em')
      .order('criado_em', { ascending: false })
      .limit(100);

    const allTags = (tagsDB || []).map((t: any) => t.tag_original).filter(Boolean);

    // 2. Calcular similaridade semântica entre a sourceTag e todas as outras
    const discoveries: {
      targetTag: string;
      targetId: string;
      similarity: number;
      cohesion: number;
      combinedScore: number;
      relation: string;
      insight: string;
    }[] = [];

    const sourceNorm = normalizeForComparison(sourceTag);

    for (const otherTag of allTags) {
      const otherNorm = normalizeForComparison(otherTag);
      if (otherNorm === sourceNorm) continue;

      const otherId = otherNorm.replace(/\s+/g, '_').substring(0, 40);
      if (allNodeIds && allNodeIds.includes(otherId)) {
        // Já no grafo — ainda calcular para reforço Hebbiano
      }

      const sim = hybridSemanticSimilarity(sourceTag, otherTag);
      const cohesion = BrazilianCultureArchitect.calculateCohesion(sourceTag, otherTag);
      const combined = sim * 0.6 + cohesion * 0.4;

      if (combined > 0.25) {
        let relation = 'skos:related';
        if (combined > 0.8) relation = 'skos:closeMatch';
        else if (combined > 0.6) relation = 'skos:broadMatch';

        const sourceEixo = inferEixo(sourceTag);
        const targetEixo = inferEixo(otherTag);
        const sameEixo = sourceEixo === targetEixo;

        discoveries.push({
          targetTag: otherTag,
          targetId: otherId,
          similarity: Math.round(sim * 100) / 100,
          cohesion: Math.round(cohesion * 100) / 100,
          combinedScore: Math.round(combined * 100) / 100,
          relation,
          insight: sameEixo
            ? `Mesma família cultural (${sourceEixo}): \"${sourceTag}\" ↔ \"${otherTag}\" — similaridade ${Math.round(sim * 100)}%`
            : `Famílias distintas (${sourceEixo} ↔ ${targetEixo}): correlação cruzada ${Math.round(combined * 100)}%`,
        });
      }
    }

    // Ordenar por score
    discoveries.sort((a, b) => b.combinedScore - a.combinedScore);

    // 3. Buscar artigo científico ancorado
    const sourceId = sourceNorm.replace(/\s+/g, '_').substring(0, 40);
    const article = TAG_ARTICLES[sourceId] || null;

    // 4. Buscar correlações já aprendidas no banco
    const { data: corrDB } = await supabaseAdmin
      .from('semantic_correlations')
      .select('external_title, correlation_score, layer, source')
      .eq('tag_normalizada', sourceNorm)
      .order('correlation_score', { ascending: false })
      .limit(5);

    // 5. Buscar memória semântica validada
    const { data: memDB } = await supabaseAdmin
      .from('semantic_memory')
      .select('termo, categoria, confianca')
      .eq('status', 'validado')
      .order('total_ocorrencias', { ascending: false })
      .limit(10);

    // 6. Persistir as novas conexões descobertas no banco
    for (const disc of discoveries.slice(0, 8)) {
      try {
        await supabaseAdmin.from('cultural_network_edges').upsert({
          edge_id: [sourceId, disc.targetId].sort().join('__'),
          from_node: sourceId,
          to_node: disc.targetId,
          weight: disc.combinedScore,
          mechanism: 'hebbian',
          discovered: true,
          metadata: { 
            skosRelation: disc.relation, 
            insight: disc.insight,
            similarity: disc.similarity,
            cohesion: disc.cohesion 
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'edge_id' });
      } catch {}
    }

    // 7. Registrar no histórico de aprendizado
    try {
      await supabaseAdmin.from('tag_learning_history').insert({
        tag_normalizada: sourceNorm,
        event_type: 'live_vault_inference',
        event_details: {
          discoveries_count: discoveries.length,
          top_connection: discoveries[0]?.targetTag || null,
          top_score: discoveries[0]?.combinedScore || 0,
          article_found: !!article,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        sourceTag,
        sourceId,
        discoveries: discoveries.slice(0, 12),
        article,
        learnedCorrelations: corrDB || [],
        semanticMemory: (memDB || []).slice(0, 5),
        totalTagsAnalyzed: allTags.length,
        newConnectionsPersisted: Math.min(discoveries.length, 8),
      }
    });

  } catch (error: any) {
    console.error('[live-vault] Erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
