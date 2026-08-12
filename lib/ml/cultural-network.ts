/**
 * Folksonomia Digital 2.0 — Rede Cadeada de Interoperabilidade Cultural
 *
 * Sistema complexo de nós e sinapses culturais com:
 * - Propagação em cadeia (A→B→C→D)
 * - Reforço Hebbiano com coesão cultural (BrazilianCultureArchitect)
 * - Persistência em knowledge_graph + tag_learning_history
 * - Sincronização bidirecional com a UI de interoperabilidade
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { BrazilianCultureArchitect } from './cultural-architect';
import { addTriple, inferRelations } from './knowledge-graph';
import { normalizeForComparison } from './tag-correlator';

export type NetworkEixo = 'NUCLEO' | 'FESTA' | 'MUSICA' | 'SABERES' | 'CRENCAS' | 'PATRIMONIO';

export interface CulturalNetworkNode {
  id: string;
  label: string;
  eixo: NetworkEixo;
  type: string;
  desc: string;
  fill: string;
  size: number;
  x: number;
  y: number;
  activation: number;
  hash?: string;
  linksReais?: { label: string; url: string }[];
  fonte?: string;
  learnedAt?: string;
}

export interface CulturalNetworkEdge {
  from: string;
  to: string;
  weight: number;
  discovered?: boolean;
  eixoRel?: string;
  chainDepth?: number;
  mechanism?: 'hebbian' | 'propagated' | 'rag' | 'curator' | 'inferred';
}

export interface ChainInference {
  chain: string[];
  strength: number;
  mechanism: string;
  insight: string;
}

const EIXO_COLORS: Record<NetworkEixo, string> = {
  NUCLEO: '#E8490A',
  FESTA: '#1E3A8A',
  MUSICA: '#0891B2',
  SABERES: '#1A6B3A',
  CRENCAS: '#6D28D9',
  PATRIMONIO: '#E8A920',
};

function nodeIdFromLabel(label: string): string {
  return normalizeForComparison(label).replace(/\s+/g, '_').substring(0, 40);
}

function inferEixo(label: string): NetworkEixo {
  const profile = BrazilianCultureArchitect.getCulturalProfile(label);
  const axisMap: Record<string, NetworkEixo> = {
    FESTAS_CELEBRACOES: 'FESTA',
    MUSICA_DANCA_PERFORMANCE: 'MUSICA',
    SABERES_OFICIOS_MATERIAIS: 'SABERES',
    CRENCAS_RITOS: 'CRENCAS',
    TRADICAO_ORAL_COSMOLOGIAS: 'PATRIMONIO',
  };
  if (profile.axes.length > 0) {
    return axisMap[profile.axes[0]] || 'PATRIMONIO';
  }
  return 'PATRIMONIO';
}

/**
 * Propaga conexões em cadeia até maxDepth saltos.
 * A→B + B→C + C→D ⇒ A↔D com força decrescente por salto.
 */
export function propagateChain(
  edges: CulturalNetworkEdge[],
  maxDepth: number = 3,
  minStrength: number = 0.25
): { newEdges: CulturalNetworkEdge[]; chains: ChainInference[] } {
  const newEdges: CulturalNetworkEdge[] = [];
  const chains: ChainInference[] = [];
  const seen = new Set<string>();

  const adjacency = new Map<string, { to: string; weight: number }[]>();
  for (const e of edges) {
    if (!adjacency.has(e.from)) adjacency.set(e.from, []);
    if (!adjacency.has(e.to)) adjacency.set(e.to, []);
    adjacency.get(e.from)!.push({ to: e.to, weight: e.weight });
    adjacency.get(e.to)!.push({ to: e.from, weight: e.weight });
  }

  for (const start of adjacency.keys()) {
    const visited = new Set<string>([start]);
    const queue: { node: string; path: string[]; strength: number }[] = [
      { node: start, path: [start], strength: 1.0 },
    ];

    while (queue.length > 0) {
      const { node, path, strength } = queue.shift()!;
      if (path.length > maxDepth + 1) continue;

      const neighbors = adjacency.get(node) || [];
      for (const { to, weight } of neighbors) {
        if (visited.has(to)) continue;
        const newPath = [...path, to];
        const chainStrength = strength * weight * Math.pow(0.7, path.length);

        if (newPath.length >= 3 && chainStrength >= minStrength) {
          const endA = newPath[0];
          const endB = newPath[newPath.length - 1];
          const key = [endA, endB].sort().join('↔');
          if (!seen.has(key)) {
            seen.add(key);
            const cohesion = BrazilianCultureArchitect.calculateCohesion(
              endA.replace(/_/g, ' '),
              endB.replace(/_/g, ' ')
            );
            const gatedStrength = chainStrength * (0.5 + cohesion * 0.5);

            if (gatedStrength >= minStrength) {
              newEdges.push({
                from: endA,
                to: endB,
                weight: Math.round(gatedStrength * 100) / 100,
                discovered: true,
                chainDepth: newPath.length - 1,
                mechanism: 'propagated',
              });
              chains.push({
                chain: newPath,
                strength: gatedStrength,
                mechanism: 'chain_propagation',
                insight: `Cadeia ${newPath.map(n => n.replace(/_/g, ' ')).join(' → ')} (coesão: ${Math.round(cohesion * 100)}%)`,
              });
            }
          }
        }

        if (newPath.length <= maxDepth) {
          visited.add(to);
          queue.push({ node: to, path: newPath, strength: strength * weight });
        }
      }
    }
  }

  return { newEdges, chains };
}

/**
 * Reforço Hebbiano: "neurons that fire together, wire together"
 */
export function hebbianReinforce(
  edges: CulturalNetworkEdge[],
  nodeA: string,
  nodeB: string,
  delta: number = 0.08
): CulturalNetworkEdge[] {
  const updated = [...edges];
  const idx = updated.findIndex(
    e => (e.from === nodeA && e.to === nodeB) || (e.from === nodeB && e.to === nodeA)
  );
  if (idx >= 0) {
    updated[idx] = {
      ...updated[idx],
      weight: Math.min(1.0, updated[idx].weight + delta),
      mechanism: 'hebbian',
    };
  } else {
    updated.push({
      from: nodeA,
      to: nodeB,
      weight: 0.5 + delta,
      discovered: true,
      mechanism: 'hebbian',
    });
  }
  return updated;
}

/**
 * Sincroniza resultados RAG (relatório semântico) na rede cadeada.
 */
export async function syncFromRAG(payload: {
  tag: string;
  fontesAcademicas?: { titulo: string; link: string; fonte: string; autores?: string }[];
  siblings?: { tag: string; score: number }[];
  certeza?: number;
}): Promise<{ nodes: CulturalNetworkNode[]; edges: CulturalNetworkEdge[]; chains: ChainInference[] }> {
  const tagId = nodeIdFromLabel(payload.tag);
  const eixo = inferEixo(payload.tag);
  const nodes: CulturalNetworkNode[] = [];
  const edges: CulturalNetworkEdge[] = [];

  nodes.push({
    id: tagId,
    label: payload.tag,
    eixo,
    type: 'Conceito Aprendido (RAG)',
    desc: `Integrado via Relatório Semântico — certeza ${payload.certeza ?? '?'}%`,
    fill: '#6D28D9',
    size: 14,
    x: 400 + Math.cos(Math.random() * Math.PI * 2) * 160,
    y: 215 + Math.sin(Math.random() * Math.PI * 2) * 160,
    activation: 1.0,
    hash: `rag_${Date.now().toString(36)}`,
    fonte: 'relatorio-semantico',
    learnedAt: new Date().toISOString(),
  });

  edges.push({ from: 'core', to: tagId, weight: 0.85, discovered: true, mechanism: 'rag' });

  // Artigos acadêmicos como nós PATRIMONIO
  (payload.fontesAcademicas || []).slice(0, 5).forEach((art, i) => {
    const artId = `art_${tagId}_${i}`;
    nodes.push({
      id: artId,
      label: art.titulo.substring(0, 35),
      eixo: 'PATRIMONIO',
      type: 'Artigo Científico (RAG)',
      desc: art.autores ? `Por ${art.autores}` : art.fonte,
      fill: EIXO_COLORS.PATRIMONIO,
      size: 10,
      x: 400 + Math.cos((i / 5) * Math.PI * 2) * 100,
      y: 215 + Math.sin((i / 5) * Math.PI * 2) * 100,
      activation: 0.8,
      linksReais: art.link ? [{ label: 'Publicação', url: art.link }] : [],
      fonte: art.fonte,
    });
    edges.push({ from: tagId, to: artId, weight: 0.7, discovered: true, mechanism: 'rag', eixoRel: 'PATRIMONIO' });
    edges.push({ from: 'artigo_popular', to: artId, weight: 0.55, discovered: true, mechanism: 'rag' });
  });

  // Tags irmãs como sinapses culturais
  (payload.siblings || []).slice(0, 4).forEach(sib => {
    const sibId = nodeIdFromLabel(sib.tag);
    const cohesion = BrazilianCultureArchitect.calculateCohesion(payload.tag, sib.tag);
    if (cohesion >= 0.3) {
      nodes.push({
        id: sibId,
        label: sib.tag,
        eixo: inferEixo(sib.tag),
        type: 'Tag Correlata (ML)',
        desc: `Similaridade ${Math.round(sib.score * 100)}% — coesão cultural ${Math.round(cohesion * 100)}%`,
        fill: EIXO_COLORS[inferEixo(sib.tag)],
        size: 12,
        x: 400 + Math.random() * 200 - 100,
        y: 215 + Math.random() * 200 - 100,
        activation: sib.score,
        fonte: 'tag-correlator',
      });
      edges.push({
        from: tagId,
        to: sibId,
        weight: sib.score * cohesion,
        discovered: true,
        mechanism: 'inferred',
      });
    }
  });

  // Propagação em cadeia
  const { newEdges, chains } = propagateChain(edges, 3, 0.2);
  const allEdges = [...edges, ...newEdges];

  // Persistir triplas no knowledge graph
  for (const edge of allEdges.slice(0, 15)) {
    try {
      const inferences = await inferRelations(
        edge.from.replace(/_/g, ' '),
        edge.to.replace(/_/g, ' ')
      );
      const relation = inferences[0]?.relation || 'related_to';
      await addTriple(edge.from, relation, edge.to, {
        confidence: edge.weight,
        layer: edge.discovered ? 'inferred' : 'factual',
        source: 'inferred',
        mechanism: edge.mechanism || 'cultural_network',
      });
    } catch {
      // Silent — grafo funciona mesmo offline
    }
  }

  // Persistir evento de aprendizado
  const tagNorm = normalizeForComparison(payload.tag);
  try {
    await supabaseAdmin.from('tag_learning_history').insert({
      tag_normalizada: tagNorm,
      event_type: 'cultural_network_sync',
      event_details: {
        nodes_added: nodes.length,
        edges_added: allEdges.length,
        chains_discovered: chains.length,
        certeza: payload.certeza,
        chains: chains.slice(0, 5).map(c => c.insight),
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    // Tabela pode não existir em dev
  }

  // Persistir topologia na tabela cultural_network (se existir)
  await persistNetworkState(nodes, allEdges);

  return { nodes, edges: allEdges, chains };
}

async function persistNetworkState(nodes: CulturalNetworkNode[], edges: CulturalNetworkEdge[]) {
  try {
    // Garantir nós base antes de inserir arestas (FK)
    for (const baseId of ['core', 'artigo_popular']) {
      await supabaseAdmin.from('cultural_network_nodes').upsert({
        node_id: baseId,
        label: baseId === 'core' ? 'Núcleo Folksonômico' : 'Estudos de Cultura Popular',
        eixo: baseId === 'core' ? 'NUCLEO' : 'PATRIMONIO',
        node_type: baseId === 'core' ? 'Núcleo' : 'Artigo Científico',
        activation: baseId === 'core' ? 1.0 : 0.0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'node_id' });
    }

    for (const node of nodes) {
      await supabaseAdmin.from('cultural_network_nodes').upsert({
        node_id: node.id,
        label: node.label,
        eixo: node.eixo,
        node_type: node.type,
        description: node.desc,
        metadata: { fill: node.fill, size: node.size, linksReais: node.linksReais, fonte: node.fonte },
        activation: node.activation,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'node_id' });
    }
    for (const edge of edges) {
      const edgeId = [edge.from, edge.to].sort().join('__');
      await supabaseAdmin.from('cultural_network_edges').upsert({
        edge_id: edgeId,
        from_node: edge.from,
        to_node: edge.to,
        weight: edge.weight,
        mechanism: edge.mechanism || 'inferred',
        chain_depth: edge.chainDepth || 1,
        discovered: edge.discovered ?? false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'edge_id' });
    }
  } catch {
    // Tabelas podem não existir ainda — rede funciona em memória
  }
}

/**
 * Carrega estado persistido da rede cultural.
 */
export async function loadNetworkState(): Promise<{
  nodes: CulturalNetworkNode[];
  edges: CulturalNetworkEdge[];
  metrics: { totalNodes: number; totalEdges: number; avgWeight: number; chainCount: number };
}> {
  try {
    const [{ data: dbNodes }, { data: dbEdges }] = await Promise.all([
      supabaseAdmin.from('cultural_network_nodes').select('*').order('updated_at', { ascending: false }).limit(100),
      supabaseAdmin.from('cultural_network_edges').select('*').order('weight', { ascending: false }).limit(200),
    ]);

    if (dbNodes && dbNodes.length > 0) {
      const nodes: CulturalNetworkNode[] = dbNodes.map((n: any, i: number) => ({
        id: n.node_id,
        label: n.label,
        eixo: n.eixo as NetworkEixo,
        type: n.node_type,
        desc: n.description || '',
        fill: n.metadata?.fill || EIXO_COLORS[n.eixo as NetworkEixo] || '#888',
        size: n.metadata?.size || 12,
        x: 400 + Math.cos((i / dbNodes.length) * Math.PI * 2) * 180,
        y: 215 + Math.sin((i / dbNodes.length) * Math.PI * 2) * 180,
        activation: n.activation ?? 0,
        linksReais: n.metadata?.linksReais,
        fonte: n.metadata?.fonte,
      }));

      const edges: CulturalNetworkEdge[] = (dbEdges || []).map((e: any) => ({
        from: e.from_node,
        to: e.to_node,
        weight: Number(e.weight),
        discovered: e.discovered,
        mechanism: e.mechanism,
        chainDepth: e.chain_depth,
      }));

      const avgWeight = edges.length > 0
        ? edges.reduce((s, e) => s + e.weight, 0) / edges.length
        : 0;

      return {
        nodes,
        edges,
        metrics: { totalNodes: nodes.length, totalEdges: edges.length, avgWeight, chainCount: 0 },
      };
    }
  } catch {
    // Fallback para rede vazia
  }

  return { nodes: [], edges: [], metrics: { totalNodes: 0, totalEdges: 0, avgWeight: 0, chainCount: 0 } };
}
