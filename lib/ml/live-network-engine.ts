/**
 * Folksonomia Digital 2.0 — Motor de Rede Viva com Modelos ML/DL
 *
 * Orquestra ModernBERT, RotatE, GAT e MLP Cognitivo para descobrir
 * conexões vivas entre nós da interoperabilidade cultural em tempo real.
 */

import { mlClient } from './ml-client';
import { inferRelations } from './knowledge-graph';
import { BrazilianCultureArchitect } from './cultural-architect';
import { hybridSemanticSimilarity } from './similarity';
import { cognitiveNN } from './cognitive-nn';
import { propagateChain, hebbianReinforce, CulturalNetworkEdge, CulturalNetworkNode, ChainInference } from './cultural-network';
import { normalizeForComparison } from './tag-correlator';
import { ML_SERVICE_URL } from '@/lib/core/env';

export type LiveModelId = 'modernbert' | 'rotate' | 'gat' | 'mlp' | 'xenova' | 'heuristic';

export interface ModelStatus {
  id: LiveModelId;
  name: string;
  online: boolean;
  role: string;
  lastUsed?: string;
  inferenceCount: number;
}

export interface LiveConnection {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  weight: number;
  model: LiveModelId;
  relation?: string;
  confidence: number;
  discovered: boolean;
  mechanism: CulturalNetworkEdge['mechanism'];
  insight: string;
}

export interface PulseSignal {
  id: string;
  from: string;
  to: string;
  progress: number;
  model: LiveModelId;
  intensity: number;
}

export interface LiveNetworkResult {
  connections: LiveConnection[];
  pulses: PulseSignal[];
  chains: ChainInference[];
  models: ModelStatus[];
  activatedNodes: { id: string; activation: number }[];
}

const modelStats: Record<LiveModelId, { inferenceCount: number; lastUsed?: string }> = {
  modernbert: { inferenceCount: 0 },
  rotate: { inferenceCount: 0 },
  gat: { inferenceCount: 0 },
  mlp: { inferenceCount: 0 },
  xenova: { inferenceCount: 0 },
  heuristic: { inferenceCount: 0 },
};

function bumpModel(id: LiveModelId) {
  modelStats[id].inferenceCount++;
  modelStats[id].lastUsed = new Date().toISOString();
}

function nodeId(label: string): string {
  return normalizeForComparison(label).replace(/\s+/g, '_').substring(0, 40);
}

async function getModelStatuses(): Promise<ModelStatus[]> {
  const mlOnline = await mlClient.isOnline();
  const health = mlOnline ? await mlClient.health() : null;

  return [
    {
      id: 'modernbert',
      name: 'ModernBERT NER',
      online: !!(health?.models?.ner),
      role: 'Classificação de entidades culturais',
      lastUsed: modelStats.modernbert.lastUsed,
      inferenceCount: modelStats.modernbert.inferenceCount,
    },
    {
      id: 'rotate',
      name: 'RotatE',
      online: mlOnline && !!ML_SERVICE_URL,
      role: 'Predição de relações no grafo de conhecimento',
      lastUsed: modelStats.rotate.lastUsed,
      inferenceCount: modelStats.rotate.inferenceCount,
    },
    {
      id: 'gat',
      name: 'GAT Clustering',
      online: mlOnline && !!ML_SERVICE_URL,
      role: 'Comunidades sobrepostas e fronteiras fluidas',
      lastUsed: modelStats.gat.lastUsed,
      inferenceCount: modelStats.gat.inferenceCount,
    },
    {
      id: 'mlp',
      name: 'MLP Cognitivo',
      online: true,
      role: 'Confiança calibrada 10→8→1 (Adam)',
      lastUsed: modelStats.mlp.lastUsed,
      inferenceCount: modelStats.mlp.inferenceCount,
    },
    {
      id: 'xenova',
      name: 'Xenova MiniLM',
      online: true,
      role: 'Embeddings locais 384d para similaridade',
      lastUsed: modelStats.xenova.lastUsed,
      inferenceCount: modelStats.xenova.inferenceCount,
    },
    {
      id: 'heuristic',
      name: 'Cultural Architect',
      online: true,
      role: 'Coesão cultural e gating de eixos',
      lastUsed: modelStats.heuristic.lastUsed,
      inferenceCount: modelStats.heuristic.inferenceCount,
    },
  ];
}

/**
 * Inferência multi-modelo entre par de conceitos culturais.
 */
async function inferPairConnection(
  labelA: string,
  labelB: string,
  idA: string,
  idB: string
): Promise<LiveConnection | null> {
  const cohesion = BrazilianCultureArchitect.calculateCohesion(labelA, labelB);
  if (cohesion < 0.35) return null;

  let bestWeight = 0;
  let bestModel: LiveModelId = 'heuristic';
  let relation = 'related_to';
  let insight = `Tradição compartilhada de saber e fazeres populares`;

  // 1. RotatE — predição de relação
  try {
    const inferences = await inferRelations(labelA, labelB);
    if (inferences.length > 0) {
      const top = inferences[0];
      if (top.confidence > bestWeight) {
        bestWeight = top.confidence;
        bestModel = top.source.includes('rotate') ? 'rotate' : 'heuristic';
        relation = top.relation;
        insight = `Predição de relação ontológica: ${relation.replace(/_/g, ' ')}`;
        bumpModel(bestModel);
      }
    }
  } catch { /* fallback */ }

  // 2. ModernBERT — contexto e NER
  try {
    const ner = await mlClient.predictNER(`${labelA} ${labelB}`);
    if (ner?.tokens?.length) {
      const entities = ner.tokens.filter(t => t.category !== 'O');
      if (entities.length >= 2) {
        const nerConf = entities.reduce((s, t) => s + t.confidence, 0) / entities.length;
        const nerWeight = nerConf * cohesion;
        if (nerWeight > bestWeight) {
          bestWeight = nerWeight;
          bestModel = 'modernbert';
          insight = `Entidades culturais correlacionadas: ${entities.map(e => e.category).join(', ')}`;
          bumpModel('modernbert');
        }
      }
    }
  } catch { /* fallback */ }

  // 3. Xenova/heurística — similaridade semântica
  bumpModel('xenova');
  const sim = hybridSemanticSimilarity(labelA, labelB);
  const simWeight = sim * cohesion;
  if (simWeight > bestWeight * 0.8) {
    bestWeight = Math.max(bestWeight, simWeight);
    if (bestModel === 'heuristic') {
      insight = `Matriz e afinidade expressiva compartilhada`;
    }
  }

  // 4. MLP Cognitivo — calibrar peso final
  try {
    await cognitiveNN.ensureLoaded();
    const inputVec = cognitiveNN.factorsToVector({
      modelProbability: bestWeight,
      vectorSimilarity: sim,
      externalSourceCount: 2,
      externalSourceQuality: cohesion,
      categoryAccuracy: cohesion,
      memoryMatches: 1,
      termLength: (labelA.length + labelB.length) / 2,
      isMultiWord: labelA.includes(' ') || labelB.includes(' '),
    });
    const { output } = cognitiveNN.forward(inputVec);
    bestWeight = bestWeight * 0.6 + output * 0.4;
    bumpModel('mlp');
  } catch { /* silent */ }

  bumpModel('heuristic');

  if (bestWeight < 0.42) return null;

  return {
    from: idA,
    to: idB,
    fromLabel: labelA,
    toLabel: labelB,
    weight: Math.round(bestWeight * 100) / 100,
    model: bestModel,
    relation,
    confidence: Math.round(bestWeight * 100),
    discovered: true,
    mechanism: 'inferred',
    insight,
  };
}

/**
 * Escaneia nós e descobre conexões vivas via ensemble de modelos.
 */
export async function discoverLiveConnections(
  nodes: { id: string; label: string }[],
  maxPairs: number = 12
): Promise<LiveNetworkResult> {
  const connections: LiveConnection[] = [];
  const seen = new Set<string>();
  const candidates: [typeof nodes[0], typeof nodes[0]][] = [];

  const filtered = nodes.filter(n => n.id !== 'core');
  for (let i = 0; i < filtered.length; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      candidates.push([filtered[i], filtered[j]]);
    }
  }

  // Priorizar pares com coesão prévia alta
  candidates.sort((a, b) => {
    const cohA = BrazilianCultureArchitect.calculateCohesion(a[0].label, a[1].label);
    const cohB = BrazilianCultureArchitect.calculateCohesion(b[0].label, b[1].label);
    return cohB - cohA;
  });

  for (const [a, b] of candidates.slice(0, maxPairs)) {
    const key = [a.id, b.id].sort().join('↔');
    if (seen.has(key)) continue;
    seen.add(key);

    const conn = await inferPairConnection(a.label, b.label, a.id, b.id);
    if (conn) connections.push(conn);
  }

  const edges: CulturalNetworkEdge[] = connections.map(c => ({
    from: c.from,
    to: c.to,
    weight: c.weight,
    discovered: c.discovered,
    mechanism: c.mechanism,
  }));

  const { newEdges, chains } = propagateChain(edges, 3, 0.18);

  const pulses: PulseSignal[] = connections.slice(0, 8).map((c, i) => ({
    id: `pulse-${Date.now()}-${i}`,
    from: c.from,
    to: c.to,
    progress: 0,
    model: c.model,
    intensity: c.weight,
  }));

  const activatedNodes = connections.flatMap(c => [
    { id: c.from, activation: c.weight },
    { id: c.to, activation: c.weight * 0.8 },
  ]);

  const models = await getModelStatuses();

  return { connections, pulses, chains, models, activatedNodes };
}

/**
 * Pulso de ativação na rede — spreading activation ponderado por modelos.
 */
export async function pulseLiveNetwork(
  nodes: CulturalNetworkNode[],
  edges: CulturalNetworkEdge[],
  sourceId?: string
): Promise<LiveNetworkResult> {
  const activeNodes = nodes.filter(n => n.id !== 'core');
  if (activeNodes.length === 0) {
    return { connections: [], pulses: [], chains: [], models: await getModelStatuses(), activatedNodes: [] };
  }

  const source = sourceId
    ? nodes.find(n => n.id === sourceId) || activeNodes[Math.floor(Math.random() * activeNodes.length)]
    : activeNodes[Math.floor(Math.random() * activeNodes.length)];

  const activationMap: Record<string, number> = {};
  nodes.forEach(n => { activationMap[n.id] = Math.max(0, (n.activation ?? 0) - 0.06); });
  activationMap[source.id] = 1.0;
  activationMap['core'] = Math.min(1, (activationMap['core'] ?? 0) + 0.35);

  const pulses: PulseSignal[] = [];
  const reinforced: LiveConnection[] = [];

  // Propagação 1º e 2º grau com pesos sinápticos
  for (const edge of edges) {
    const involvesSource = edge.from === source.id || edge.to === source.id;
    if (!involvesSource) continue;

    const neighborId = edge.from === source.id ? edge.to : edge.from;
    const transmission = edge.weight * 0.5;
    activationMap[neighborId] = Math.min(1, (activationMap[neighborId] ?? 0) + transmission);

    pulses.push({
      id: `pulse-${source.id}-${neighborId}-${Date.now()}`,
      from: source.id,
      to: neighborId,
      progress: 0,
      model: edge.mechanism === 'rag' ? 'modernbert' : edge.mechanism === 'propagated' ? 'rotate' : 'mlp',
      intensity: edge.weight,
    });

    // Hebbian: se ambos ativados, reforçar
    if (transmission > 0.3) {
      const neighbor = nodes.find(n => n.id === neighborId);
      if (neighbor) {
        reinforced.push({
          from: source.id,
          to: neighborId,
          fromLabel: source.label,
          toLabel: neighbor.label,
          weight: Math.min(1, edge.weight + 0.03),
          model: 'mlp',
          confidence: Math.round(transmission * 100),
          discovered: edge.discovered ?? false,
          mechanism: 'hebbian',
          insight: `Hebbian: "${source.label}" ↔ "${neighbor.label}" reforçado (+3%)`,
        });
        bumpModel('mlp');
      }
    }

    // 2º grau
    for (const edge2 of edges) {
      if (edge2.from !== neighborId && edge2.to !== neighborId) continue;
      const n2Id = edge2.from === neighborId ? edge2.to : edge2.from;
      if (n2Id === source.id) continue;
      const t2 = transmission * edge2.weight * 0.25;
      activationMap[n2Id] = Math.min(1, (activationMap[n2Id] ?? 0) + t2);
    }
  }

  const activatedNodes = Object.entries(activationMap)
    .filter(([, v]) => v > 0.05)
    .map(([id, activation]) => ({ id, activation: Math.round(activation * 100) / 100 }));

  // Descobrir 1-2 conexões novas via modelos a cada pulso
  const neighbors = edges
    .filter(e => e.from === source.id || e.to === source.id)
    .map(e => e.from === source.id ? e.to : e.from);

  const unconnected = activeNodes
    .filter(n => n.id !== source.id && !neighbors.includes(n.id))
    .slice(0, 2);

  const newConnections: LiveConnection[] = [];
  for (const target of unconnected) {
    const conn = await inferPairConnection(source.label, target.label, source.id, target.id);
    if (conn) newConnections.push(conn);
  }

  const allEdges = [
    ...edges,
    ...newConnections.map(c => ({ from: c.from, to: c.to, weight: c.weight, discovered: true, mechanism: 'inferred' as const })),
  ];
  const { chains } = propagateChain(allEdges, 3, 0.2);

  return {
    connections: [...reinforced, ...newConnections],
    pulses,
    chains,
    models: await getModelStatuses(),
    activatedNodes,
  };
}

/**
 * Converte LiveConnection para CulturalNetworkEdge persistível.
 */
export function liveToEdge(conn: LiveConnection): CulturalNetworkEdge & { model?: string; relation?: string } {
  return {
    from: conn.from,
    to: conn.to,
    weight: conn.weight,
    discovered: conn.discovered,
    mechanism: conn.mechanism,
    model: conn.model,
    relation: conn.relation,
  };
}

export { getModelStatuses, hebbianReinforce };
