import { NextRequest, NextResponse } from 'next/server';
import {
  loadNetworkState,
  syncFromRAG,
  propagateChain,
  hebbianReinforce,
  CulturalNetworkEdge,
} from '@/lib/ml/cultural-network';
import { getLearningMetrics, processTrainingBatch } from '@/lib/ml/training-loop';

export const dynamic = 'force-dynamic';

/**
 * GET — Carrega estado da rede + métricas de aprendizado progressivo
 */
export async function GET() {
  try {
    const [network, metrics] = await Promise.all([
      loadNetworkState(),
      getLearningMetrics(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        nodes: network.nodes,
        edges: network.edges,
        metrics: { ...network.metrics, ...metrics },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST — Sincroniza RAG, reforço Hebbiano ou ciclo de treinamento
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'sync' } = body;

    if (action === 'sync') {
      const { tag, fontesAcademicas, siblings, certeza } = body;
      if (!tag) {
        return NextResponse.json({ success: false, error: 'Tag obrigatória' }, { status: 400 });
      }
      const result = await syncFromRAG({ tag, fontesAcademicas, siblings, certeza });
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'hebbian') {
      const { nodeA, nodeB, edges = [] } = body;
      if (!nodeA || !nodeB) {
        return NextResponse.json({ success: false, error: 'nodeA e nodeB obrigatórios' }, { status: 400 });
      }
      const reinforced = hebbianReinforce(edges as CulturalNetworkEdge[], nodeA, nodeB);
      return NextResponse.json({ success: true, data: { edges: reinforced } });
    }

    if (action === 'propagate') {
      const { edges = [] } = body;
      const { newEdges, chains } = propagateChain(edges, 3, 0.2);
      return NextResponse.json({ success: true, data: { newEdges, chains } });
    }

    if (action === 'train') {
      const limit = body.limit || 2;
      const results = await processTrainingBatch(limit);
      const metrics = await getLearningMetrics();
      return NextResponse.json({ success: true, data: { results, metrics } });
    }

    return NextResponse.json({ success: false, error: 'Ação desconhecida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
