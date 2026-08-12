/**
 * API Route: /api/ml/collect-training-data
 * 
 * Endpoint que aciona a coleta de dados da Europeana e IBRAM
 * e gera o dataset de treinamento NER para o ModernBERT.
 */

import { NextRequest, NextResponse } from 'next/server';
import { collectTrainingData, exportToHuggingFace } from '@/lib/ml/training-data-collector';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const europeanaRows = body.europeanaRows || 50;
    const ibramPerMuseum = body.ibramPerMuseum || 20;

    const result = await collectTrainingData(europeanaRows, ibramPerMuseum);

    return NextResponse.json({
      success: true,
      stats: result.stats,
      preview: result.samples.slice(0, 3).map(s => ({
        id: s.id,
        source: s.source,
        text: s.text.substring(0, 200) + '...',
        labeledTokens: s.tokens.filter(t => t.label !== 'O').length,
        totalTokens: s.tokens.length
      }))
    });
  } catch (err) {
    console.error('[CollectTrainingData] Error:', err);
    return NextResponse.json({ error: 'Erro na coleta de dados' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await collectTrainingData(10, 5);
    const huggingfaceFormat = exportToHuggingFace(result.samples);

    return new NextResponse(huggingfaceFormat, {
      headers: {
        'Content-Type': 'application/jsonl',
        'Content-Disposition': 'attachment; filename="folksonomia-ner-dataset.jsonl"'
      }
    });
  } catch (err) {
    return NextResponse.json({ error: 'Erro na exportação' }, { status: 500 });
  }
}
