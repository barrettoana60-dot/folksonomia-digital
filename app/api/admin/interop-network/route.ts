import { NextRequest, NextResponse } from 'next/server';
import {
  loadNetworkState,
  syncFromRAG,
  propagateChain,
  hebbianReinforce,
  CulturalNetworkEdge,
} from '@/lib/ml/cultural-network';
import {
  runSpreadingActivation,
  calculateCentralityMetrics,
  generateDeterministicHash,
  CULTURAL_INTEROP_5_LAYERS,
  CULTURAL_INTEROP_REFERENCES
} from '@/lib/ml/graph-math';
import { getLearningMetrics, processTrainingBatch } from '@/lib/ml/training-loop';

export const dynamic = 'force-dynamic';

/**
 * GET — Carrega estado da rede + métricas de aprendizado progressivo + camadas de interoperabilidade
 */
export async function GET() {
  try {
    const [network, metrics] = await Promise.all([
      loadNetworkState(),
      getLearningMetrics(),
    ]);

    const centrality = calculateCentralityMetrics(network.nodes as any, network.edges as any);

    return NextResponse.json({
      success: true,
      data: {
        nodes: network.nodes,
        edges: network.edges,
        metrics: { ...network.metrics, ...metrics },
        centrality,
        layers: CULTURAL_INTEROP_5_LAYERS,
        references: CULTURAL_INTEROP_REFERENCES,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST — Sincroniza RAG, Spreading Activation, reforço Hebbiano ou snapshots
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

    if (action === 'spreading') {
      const { nodes = [], edges = [], sources = [], params = {} } = body;
      const result = runSpreadingActivation(nodes, edges, sources, params);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'centrality') {
      const { nodes = [], edges = [] } = body;
      const result = calculateCentralityMetrics(nodes, edges);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'snapshot') {
      const { nodes = [], edges = [], metadata = {} } = body;
      const hash = generateDeterministicHash({ nodes, edges, metadata, ts: Date.now() });
      return NextResponse.json({
        success: true,
        data: {
          snapshotId: `snap_${Date.now().toString(36)}`,
          hash,
          nodeCount: nodes.length,
          edgeCount: edges.length,
          timestamp: new Date().toISOString(),
        }
      });
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
