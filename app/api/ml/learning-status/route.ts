import { NextResponse } from 'next/server';
import { getLearningMetrics, processTrainingBatch } from '@/lib/ml/training-loop';

export const dynamic = 'force-dynamic';

/**
 * GET — Métricas reais do aprendizado contínuo e progressivo (MLP + fila + cadeias)
 */
export async function GET() {
  try {
    const metrics = await getLearningMetrics();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST — Dispara ciclo de treinamento progressivo
 */
export async function POST(req: Request) {
  try {
    const { limit = 2 } = await req.json().catch(() => ({}));
    const results = await processTrainingBatch(limit);
    const metrics = await getLearningMetrics();
    return NextResponse.json({ success: true, data: { results, metrics } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
