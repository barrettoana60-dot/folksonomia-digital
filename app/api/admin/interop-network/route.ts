import { NextRequest, NextResponse } from 'next/server';
import {
  loadNetworkState,
  syncFromRAG,
  propagateChain,
  hebbianReinforce,
  CulturalNetworkEdge,
  CulturalNetworkNode,
} from '@/lib/ml/cultural-network';
import {
  runSpreadingActivation,
  calculateCentralityMetrics,
  generateDeterministicHash,
  CULTURAL_INTEROP_5_LAYERS,
  CULTURAL_INTEROP_REFERENCES
} from '@/lib/ml/graph-math';
import {
  discoverLiveConnections,
  pulseLiveNetwork,
  getModelStatuses,
  liveToEdge,
} from '@/lib/ml/live-network-engine';
import { getLearningMetrics, processTrainingBatch } from '@/lib/ml/training-loop';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

async function persistLiveEdges(edges: (CulturalNetworkEdge & { model?: string; relation?: string; insight?: string })[]) {
  try {
    for (const edge of edges) {
      const edgeId = [edge.from, edge.to].sort().join('__');
      await supabaseAdmin.from('cultural_network_edges').upsert({
        edge_id: edgeId,
        from_node: edge.from,
        to_node: edge.to,
        weight: edge.weight,
        mechanism: edge.mechanism || 'inferred',
        chain_depth: edge.chainDepth || 1,
        discovered: edge.discovered ?? true,
        metadata: { model: edge.model, relation: edge.relation, insight: edge.insight, live: true },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'edge_id' });
    }
  } catch { /* tabela pode não existir */ }
}

/**
 * GET — Carrega estado da rede + métricas + status dos modelos ML/DL + camadas de interoperabilidade
 */
export async function GET() {
  try {
    const [network, metrics, models] = await Promise.all([
      loadNetworkState(),
      getLearningMetrics(),
      getModelStatuses(),
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
        models,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST — Ações da rede: sync, spreading, centrality, snapshot, pulse, infer-live, hebbian, propagate, train
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

    if (action === 'pulse') {
      const { nodes = [], edges = [], sourceId } = body;
      const result = await pulseLiveNetwork(
        nodes as CulturalNetworkNode[],
        edges as CulturalNetworkEdge[],
        sourceId
      );
      if (result.connections.length > 0) {
        await persistLiveEdges(result.connections.map(liveToEdge));
      }
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'infer-live') {
      const { nodes = [] } = body;
      if (!nodes.length) {
        return NextResponse.json({ success: false, error: 'Nós obrigatórios' }, { status: 400 });
      }
      const result = await discoverLiveConnections(nodes, body.maxPairs || 12);
      if (result.connections.length > 0) {
        await persistLiveEdges(result.connections.map(liveToEdge));
      }
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
      const models = await getModelStatuses();
      return NextResponse.json({ success: true, data: { results, metrics, models } });
    }

    if (action === 'model-status') {
      const models = await getModelStatuses();
      return NextResponse.json({ success: true, data: { models } });
    }

    return NextResponse.json({ success: false, error: 'Ação desconhecida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
