import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { runSemanticPipeline } from '@/lib/ml/pipeline';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { nucleo_id } = await req.json();

    const { data: nucleo } = await supabaseAdmin
      .from('nucleos')
      .select('*')
      .eq('id', nucleo_id)
      .single();

    if (!nucleo) {
      return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 });
    }

    const result = await runSemanticPipeline(
      nucleo.conteudo_original,
      nucleo.obra_id || '',
      ''
    );

    // Formatar embedding para pgvector
    const embeddingVector = Array.isArray(result.dna.embedding)
      ? `[${result.dna.embedding.join(',')}]`
      : null;

    await supabaseAdmin
      .from('nucleos')
      .update({
        embedding: embeddingVector,
        confianca: result.semantics.indicators.confidence,
        novidade: result.semantics.indicators.novelty,
        tensao: result.semantics.indicators.tension,
        ressonancia: result.semantics.indicators.resonance,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', nucleo_id);

    await supabaseAdmin.from('ml_execucoes').insert({
      nucleo_id,
      tipo_execucao: 'recalculo_semantico',
      resumo: `Recálculo v3 calibrado. Motor: ${result.meta.motors.tokenClassifier}. Confiança: ${result.confidence.status}.`,
      status: 'concluido',
      metricas: { 
        confianca: result.confidence.calibrated,
        novidade: result.semantics.indicators.novelty,
        motor: result.meta.motors.tokenClassifier,
        evidencias: result.evidence.total
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Análise semântica recalculada com sucesso.',
      indicadores: {
        nivel_conexao: Math.round(result.semantics.indicators.confidence),
        nivel_novidade: Math.round(result.semantics.indicators.novelty),
        conceitos_sugeridos: result.semantics.concepts
      }
    });
  } catch (err) {
    console.error('Recalcular error:', err);
    return NextResponse.json({ error: 'Erro ao recalcular.' }, { status: 500 });
  }
}
