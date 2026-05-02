/**
 * API Route: /api/ml/train-model
 * 
 * Aciona o treinamento autônomo do classificador NER.
 * Coleta dados das APIs da Europeana e IBRAM, extrai features,
 * treina o modelo Naive Bayes e salva no Supabase.
 */

import { NextRequest, NextResponse } from 'next/server';
import { trainModel } from '@/lib/ml/autonomous-trainer';

export async function POST(req: NextRequest) {
  try {
    // Verifica se a requisição tem header de autorização simples (opcional, para proteção básica)
    const authHeader = req.headers.get('authorization');
    if (process.env.ADMIN_SECRET && authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const model = await trainModel();

    return NextResponse.json({
      success: true,
      message: 'Modelo treinado com sucesso',
      model_info: {
        version: model.version,
        trainedAt: model.trainedAt,
        totalSamples: model.totalSamples,
        totalTokens: model.totalTokens,
        vocabularySize: Object.keys(model.vocabulary).length,
        accuracy: `${(model.accuracy * 100).toFixed(1)}%`,
        labelDistribution: model.labelDistribution
      }
    });
  } catch (err) {
    console.error('[TrainModelAPI] Error:', err);
    return NextResponse.json({ error: 'Erro no treinamento do modelo' }, { status: 500 });
  }
}
