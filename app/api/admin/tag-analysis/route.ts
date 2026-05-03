import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { runBrainAnalysis } from '@/lib/ml/brain';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/tag-analysis
 * 
 * O CÉREBRO analisa uma tag:
 * 1. Roda análise ML (família, duplicatas, erros, sinônimos)
 * 2. Carrega conhecimento prévio do banco
 * 3. Propaga conexões (A→B + B→C = A↔C)
 * 4. Calcula DNA semântico da tag
 * 5. Persiste TUDO no banco (aprende)
 * 6. Retorna mapa neural completo com rastro de informação
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

    // 2. Executar análise cerebral completa
    const brainState = await runBrainAnalysis(tagClean, allTags);

    // 3. Formatar para o frontend
    // Separar conexões por tipo para visualização
    const duplicates = brainState.neuralMap
      .filter(c => c.connectionType === 'duplicate' || c.connectionType === 'spelling')
      .map(c => ({ tag: c.tagB, score: c.strength, reason: c.evidence[0] || '', type: c.connectionType }));

    const siblings = brainState.neuralMap
      .filter(c => c.connectionType === 'synonym' || c.connectionType === 'family' || c.connectionType === 'co_occurrence')
      .map(c => ({ tag: c.tagB, score: c.strength, reason: c.evidence[0] || '', type: c.connectionType }));

    const propagated = brainState.neuralMap
      .filter(c => c.connectionType === 'propagated')
      .map(c => ({ tag: c.tagB, score: c.strength, reason: c.evidence[0] || '', type: c.connectionType }));

    // Detectar família do resultado da análise
    const familyConn = brainState.neuralMap.find(c => c.connectionType === 'family');
    const { detectTagFamily } = await import('@/lib/ml/tag-correlator');
    const family = detectTagFamily(tagClean);

    // Gerar sugestões inteligentes baseadas no estado cerebral
    const suggestions: string[] = [];
    
    if (duplicates.length > 0) {
      suggestions.push(`⚠ ${duplicates.length} tag(s) duplicada(s) detectada(s) — considere mesclar: ${duplicates.map(d => `"${d.tag}"`).join(', ')}`);
    }
    if (family) {
      const familyTags = brainState.neuralMap.filter(c => c.connectionType === 'family').map(c => c.tagB);
      if (familyTags.length > 0) {
        suggestions.push(`🏛 Esta tag pertence à família "${family.name}" — ${familyTags.length} membro(s) encontrado(s) no banco`);
      } else {
        suggestions.push(`🏛 Esta tag pertence à família "${family.name}" — nenhum outro membro encontrado ainda no banco`);
      }
    }
    if (propagated.length > 0) {
      suggestions.push(`🧠 ${propagated.length} conexão(ões) inferida(s) por propagação — o cérebro detectou caminhos indiretos entre tags`);
    }
    if (brainState.totalTraces > 3) {
      suggestions.push(`📊 O cérebro já acumulou ${brainState.totalTraces} registro(s) de aprendizado sobre esta tag`);
    }

    return NextResponse.json({
      success: true,
      data: {
        // Identidade
        tag: tagClean,
        normalized: brainState.tag,
        family,
        
        // Conexões encontradas
        duplicates,
        siblings,
        propagated,
        totalRelated: brainState.totalConnections,
        
        // Mapa neural completo
        neuralMap: brainState.neuralMap.slice(0, 30),
        
        // DNA semântico
        dna: brainState.dnaSignature,
        
        // Rastro de informação (de onde veio, para onde vai)
        traces: brainState.traces.slice(0, 15),
        totalTraces: brainState.totalTraces,
        
        // Insights propagados
        propagatedInsights: brainState.propagatedInsights,
        
        // Sugestões
        suggestions
      }
    });

  } catch (error: any) {
    console.error('Erro na análise cerebral:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
