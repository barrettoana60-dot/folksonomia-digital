import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { runSemanticPipeline } from '@/lib/ml/pipeline';

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

    const { cell, semantics } = await runSemanticPipeline(
      nucleo.conteudo_original,
      nucleo.obra_id,
      ''
    );

    await supabaseAdmin
      .from('nucleos')
      .update({
        embedding: cell.embedding,
        confianca: semantics.confidence,
        novidade: semantics.novelty,
        tensao: semantics.tension,
        ressonancia: semantics.resonance,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', nucleo_id);

    await supabaseAdmin.from('ml_execucoes').insert({
      nucleo_id,
      tipo_execucao: 'recalculo_semantico',
      resumo: `Recálculo solicitado pelo curador. ${semantics.concepts.length} conceitos identificados.`,
      status: 'concluido',
      metricas: { confianca: semantics.confidence, novidade: semantics.novelty }
    });

    return NextResponse.json({
      success: true,
      message: 'Análise semântica recalculada com sucesso.',
      indicadores: {
        nivel_conexao: Math.round(semantics.confidence),
        nivel_novidade: Math.round(semantics.novelty),
        conceitos_sugeridos: semantics.concepts
      }
    });
  } catch (err) {
    console.error('Recalcular error:', err);
    return NextResponse.json({ error: 'Erro ao recalcular.' }, { status: 500 });
  }
}
