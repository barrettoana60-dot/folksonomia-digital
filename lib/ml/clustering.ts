/**
 * Folksonomia Digital 2.0 — Clustering com Multi-Membership (Refatorado)
 * 
 * Substitui o clustering de pertencimento único (threshold 0.7)
 * por um sistema de comunidades sobrepostas com pesos.
 * 
 * Implementação atual: sigmoid multi-label heurístico.
 * Futuro: Graph Attention Network (GAT) treinado.
 */

import { cosineSimilarity } from './similarity';
import type { MultiMembership, GroupMembership } from './types';

// ============================================================
// Grupos Temáticos Predefinidos
// ============================================================

interface ThemeGroup {
  id: string;
  name: string;
  keywords: string[];
  centroid: number[];
}

const THEME_GROUPS: Omit<ThemeGroup, 'centroid'>[] = [
  {
    id: 'religioso',
    name: 'Religiosidade e Sacralidade',
    keywords: ['religiao', 'fe', 'sagrado', 'santo', 'liturgia', 'oração', 'missa', 'igreja', 'capela', 'calice']
  },
  {
    id: 'maternidade',
    name: 'Maternidade e Cuidado',
    keywords: ['mae', 'mamae', 'maternidade', 'cuidado', 'familia', 'afeto', 'carinho', 'nascimento']
  },
  {
    id: 'guerra',
    name: 'Conflito e Resistência',
    keywords: ['guerra', 'conflito', 'batalha', 'arma', 'resistencia', 'combate', 'militar']
  },
  {
    id: 'tecnica_artistica',
    name: 'Técnicas Artísticas',
    keywords: ['oleo', 'tela', 'talha', 'escultura', 'pintura', 'gravura', 'aquarela', 'dourado', 'policromia']
  },
  {
    id: 'colonial',
    name: 'Período Colonial',
    keywords: ['colonial', 'barroco', 'jesuitico', 'setecentista', 'oitocentista', 'imperio', 'coroa']
  },
  {
    id: 'natureza',
    name: 'Natureza e Paisagem',
    keywords: ['natureza', 'paisagem', 'flora', 'fauna', 'rio', 'mar', 'montanha', 'floresta']
  },
  {
    id: 'proveniencia',
    name: 'Proveniência e Circulação',
    keywords: ['proveniencia', 'colecao', 'acervo', 'doacao', 'aquisicao', 'espoliacao', 'heranca']
  },
  {
    id: 'identidade',
    name: 'Identidade e Memória',
    keywords: ['identidade', 'memoria', 'tradicao', 'patrimonio', 'folclore', 'cultura', 'povo']
  }
];

// ============================================================
// Multi-Membership Clustering
// ============================================================

/**
 * Calcula o pertencimento múltiplo de uma tag a todas as comunidades.
 * Usa sigmoid (independente por grupo) em vez de softmax (exclusivo).
 * 
 * @returns MultiMembership com peso de 0-1 por grupo
 */
export async function calculateMultiMembership(
  tagText: string,
  tagVector: number[]
): Promise<MultiMembership> {
  const normalizedTag = tagText.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim();

  // 1. Tentar GAT via ML Service
  const mlServiceUrl = process.env.ML_SERVICE_URL;
  if (mlServiceUrl && tagVector.length > 0) {
    try {
      const res = await fetch(`${mlServiceUrl}/predict-communities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embedding: tagVector }),
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.communities?.length > 0) {
          return {
            entityId: normalizedTag,
            memberships: data.communities.map((c: any) => ({
              groupId: c.community_id,
              groupName: c.community_name,
              weight: Math.round(c.weight * 100) / 100,
              contextRelevance: buildContextRelevance(c.community_id, c.weight),
              source: 'gat_clustering'
            }))
          };
        }
      }
    } catch {
      // ML Service offline, usar fallback heurístico
    }
  }

  // 2. Fallback heurístico (keyword matching + sigmoid)
  const memberships: GroupMembership[] = [];

  for (const group of THEME_GROUPS) {
    let keywordScore = 0;
    const tagWords = normalizedTag.split(' ');

    for (const keyword of group.keywords) {
      for (const word of tagWords) {
        if (word === keyword || word.includes(keyword) || keyword.includes(word)) {
          keywordScore += 1;
        }
      }
    }

    const rawScore = keywordScore / Math.max(group.keywords.length * 0.3, 1);
    const weight = sigmoid(rawScore * 3 - 1.5);

    if (weight > 0.15) {
      memberships.push({
        groupId: group.id,
        groupName: group.name,
        weight: Math.round(weight * 100) / 100,
        contextRelevance: buildContextRelevance(group.id, weight)
      });
    }
  }

  memberships.sort((a, b) => b.weight - a.weight);

  return {
    entityId: normalizedTag,
    memberships
  };
}

/**
 * Agrupa tags em núcleos com suporte a pertencimento múltiplo.
 * Versão retrocompatível com a interface antiga.
 */
export function clusterTags(
  tags: { text: string; vector: number[] }[],
  existingNuclei: { centroid: number[]; tags: string[]; theme: string }[]
) {
  const result = [...existingNuclei];

  for (const tag of tags) {
    const membership = calculateMultiMembership(tag.text, tag.vector);

    if (membership.memberships.length > 0) {
      // Adicionar a todos os grupos com peso > threshold
      for (const m of membership.memberships) {
        let nucleus = result.find(n => n.theme === m.groupName);
        if (nucleus) {
          if (!nucleus.tags.includes(tag.text)) {
            nucleus.tags.push(tag.text);
            nucleus.centroid = nucleus.centroid.map((val, i) =>
              (val * 0.8) + (tag.vector[i] * 0.2)
            );
          }
        } else {
          result.push({
            centroid: tag.vector,
            tags: [tag.text],
            theme: m.groupName
          });
        }
      }
    } else {
      // Fallback: sem correspondência, criar núcleo novo
      result.push({
        centroid: tag.vector,
        tags: [tag.text],
        theme: 'Novo Núcleo'
      });
    }
  }

  return result;
}

// ============================================================
// Helpers
// ============================================================

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function buildContextRelevance(groupId: string, weight: number): Record<string, number> {
  const relevance: Record<string, number> = {};

  // Cada grupo tem contextos onde é mais/menos relevante
  const contextMap: Record<string, string[]> = {
    religioso: ['religiao', 'arte_sacra', 'liturgia'],
    maternidade: ['genero', 'familia', 'social'],
    guerra: ['historia', 'politica', 'militar'],
    tecnica_artistica: ['tecnica', 'conservacao', 'restauracao'],
    colonial: ['historia', 'politica', 'economia'],
    natureza: ['ciencia', 'paisagem', 'ecologia'],
    proveniencia: ['juridico', 'patrimonio', 'circulacao'],
    identidade: ['antropologia', 'sociologia', 'patrimonio']
  };

  const contexts = contextMap[groupId] || [];
  for (let i = 0; i < contexts.length; i++) {
    relevance[contexts[i]] = Math.round((weight * (1 - i * 0.15)) * 100) / 100;
  }

  return relevance;
}
