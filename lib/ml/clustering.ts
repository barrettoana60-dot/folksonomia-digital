import { normalizeText } from '../core/normalize';
import { hybridSemanticSimilarity } from './similarity';

export interface ClusterNode {
  id: string;
  label: string;
  group?: string;
}

export interface ClusterEdge {
  source: string;
  target: string;
  weight: number;
}

export interface ClusterResult {
  clusters: Array<{ id: string, members: string[] }>;
  edges: ClusterEdge[];
}

/**
 * Agrupa uma lista de tags/termos baseando-se em similaridade semântica.
 * Usado para a tela /admin/teia (Grafo).
 */
export function generateClusters(tags: string[], threshold: number = 0.45): ClusterResult {
  // Limpar e normalizar
  const uniqueTags = Array.from(new Set(tags.map(t => normalizeText(t)).filter(t => t.length > 0)));
  const edges: ClusterEdge[] = [];
  
  // Calcular todas as conexões acima do threshold
  for (let i = 0; i < uniqueTags.length; i++) {
    for (let j = i + 1; j < uniqueTags.length; j++) {
      const sim = hybridSemanticSimilarity(uniqueTags[i], uniqueTags[j]);
      if (sim >= threshold) {
        edges.push({
          source: uniqueTags[i],
          target: uniqueTags[j],
          weight: Number(sim.toFixed(3))
        });
      }
    }
  }
  
  // Agrupamento Simples via Disjoint Set (Union-Find)
  const parent: Record<string, string> = {};
  uniqueTags.forEach(t => { parent[t] = t; });
  
  function find(i: string): string {
    if (parent[i] === i) return i;
    return find(parent[i]);
  }
  
  function union(i: string, j: string) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }
  
  // Conectar usando as arestas fortes
  for (const edge of edges) {
    if (edge.weight >= threshold + 0.1) { // Apenas ligações fortes definem os clusters
      union(edge.source, edge.target);
    }
  }
  
  // Montar clusters
  const clusterMap: Record<string, string[]> = {};
  for (const tag of uniqueTags) {
    const root = find(tag);
    if (!clusterMap[root]) {
      clusterMap[root] = [];
    }
    clusterMap[root].push(tag);
  }
  
  const clusters = Object.keys(clusterMap)
    .map((key, idx) => ({
      id: `cluster_${idx + 1}`,
      members: clusterMap[key].sort()
    }))
    .filter(c => c.members.length > 1); // Ignorar clusters de um único elemento
    
  // Sort edges by weight descending
  edges.sort((a, b) => b.weight - a.weight);
  
  return { clusters, edges };
}
