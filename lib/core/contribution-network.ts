/**
 * Rede de Contribuições
 *
 * Modelo relacional profundo que representa as relações entre:
 *   CONTRIBUIÇÃO
 *       ├── TAG (tag_id)
 *       ├── OBJETO (object_id → obra)
 *       ├── FONTE (source_id)
 *       ├── OUTRA CONTRIBUIÇÃO (previous_contribution_id)
 *       └── VERSÃO (version, digest)
 *
 * Permite identificar quem criou uma contribuição, em qual contexto,
 * a que tag e objeto está vinculada, e qual foi o estado anterior.
 */

import { supabaseAdmin } from '../supabase/client';
import { generateSignature } from './crypto';
import { canonicalize } from './crypto';
import type { TagContribution } from './tag-identity';

// ─── TIPOS DE CONTRIBUIÇÃO ────────────────────────────────────────────────────

export type ContributionType =
  | 'criacao'
  | 'relacao'
  | 'fonte'
  | 'revisao'
  | 'validacao'
  | 'exportacao';

export interface ContributionNode {
  contributionId: string;
  tagId: string;
  tagLabel: string;
  objectId?: string;
  objectTitle?: string;
  sourceId?: string;
  sourceLabel?: string;
  previousContributionId?: string;
  timestamp: string;
  type: ContributionType;
  content?: string;
  previousState?: string;
  currentState: string;
  digest: string;
  relationships: string[];
  contributorHash?: string;
  version: number;
}

export interface ContributionRelationship {
  from: string;    // contribution_id de origem
  to: string;      // contribution_id de destino
  relationType: 'sequence' | 'tag_shared' | 'object_shared' | 'source_shared' | 'revision';
  weight: number;
}

export interface ContributionNetwork {
  nodes: ContributionNode[];
  relationships: ContributionRelationship[];
  /** Estatísticas da rede */
  stats: {
    totalContributions: number;
    totalTags: number;
    totalObjects: number;
    totalSources: number;
    contributorCount: number;
  };
}

// ─── GERAÇÃO DE IDs ───────────────────────────────────────────────────────────

export function generateContributionId(params: {
  tagId: string;
  type: ContributionType;
  timestamp: string;
  objectId?: string;
}): string {
  const seed = canonicalize({
    domain: 'folksonomia-digital/contribution/v1',
    ...params,
  });
  return generateSignature(seed).slice(0, 28);
}

// ─── PERSISTÊNCIA ─────────────────────────────────────────────────────────────

/**
 * Persiste uma contribuição na tabela tag_contributions.
 * Registra o estado anterior e atual, criando a cadeia verificável.
 */
export async function persistContribution(
  contribution: TagContribution,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('tag_contributions')
      .upsert({
        contribution_id: contribution.contributionId,
        tag_id: contribution.tagId,
        object_id: contribution.objectId || null,
        source_id: null, // resolvido em camada superior
        timestamp: contribution.timestamp,
        contribution_type: contribution.type,
        content: contribution.content || null,
        previous_state: contribution.previousState || null,
        current_state: contribution.currentState,
        digest: contribution.digest,
        relationships: contribution.relationships || [],
        contributor_hash: contribution.contributorHash || null,
      }, { onConflict: 'contribution_id', ignoreDuplicates: true });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'erro desconhecido' };
  }
}

/**
 * Persiste um registro na cadeia de versões da tag.
 */
export async function persistVersionChain(params: {
  tagId: string;
  version: number;
  previousDigest: string | null;
  currentDigest: string;
  eventType: string;
  actor: string;
  description?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('tag_version_chain')
      .upsert({
        tag_id: params.tagId,
        version: params.version,
        previous_digest: params.previousDigest,
        current_digest: params.currentDigest,
        event_type: params.eventType,
        actor: params.actor,
        description: params.description || null,
        occurred_at: new Date().toISOString(),
      }, { onConflict: 'tag_id,version', ignoreDuplicates: true });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'erro desconhecido' };
  }
}

// ─── CONSULTA DA REDE ─────────────────────────────────────────────────────────

/**
 * Carrega a rede de contribuições para uma tag específica.
 * Retorna nós e relacionamentos entre contribuições, tags, objetos e fontes.
 */
export async function loadContributionNetwork(tagId: string, limit = 50): Promise<ContributionNetwork> {
  try {
    // Carregar contribuições da tag
    const { data: contributions, error: cErr } = await supabaseAdmin
      .from('tag_contributions')
      .select(`
        contribution_id,
        tag_id,
        object_id,
        source_id,
        previous_contribution_id,
        timestamp,
        contribution_type,
        content,
        previous_state,
        current_state,
        digest,
        relationships,
        contributor_hash
      `)
      .eq('tag_id', tagId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (cErr) throw cErr;

    // Carregar identidade da tag para obter label e version
    const { data: identity } = await supabaseAdmin
      .from('tag_identities')
      .select('tag, version')
      .eq('tag_id', tagId)
      .maybeSingle();

    // Carregar obras vinculadas para obter títulos
    const objectIds = [...new Set((contributions || []).map(c => c.object_id).filter(Boolean))];
    let objectTitles: Record<string, string> = {};
    if (objectIds.length > 0) {
      const { data: obras } = await supabaseAdmin
        .from('obras')
        .select('id, titulo')
        .in('id', objectIds);
      objectTitles = Object.fromEntries((obras || []).map(o => [o.id, o.titulo]));
    }

    const nodes: ContributionNode[] = (contributions || []).map((c, idx) => ({
      contributionId: c.contribution_id,
      tagId: c.tag_id,
      tagLabel: identity?.tag || tagId,
      objectId: c.object_id || undefined,
      objectTitle: c.object_id ? objectTitles[c.object_id] : undefined,
      sourceId: c.source_id || undefined,
      previousContributionId: c.previous_contribution_id || undefined,
      timestamp: c.timestamp,
      type: c.contribution_type as ContributionType,
      content: c.content || undefined,
      previousState: c.previous_state || undefined,
      currentState: c.current_state,
      digest: c.digest,
      relationships: Array.isArray(c.relationships) ? c.relationships : [],
      contributorHash: c.contributor_hash || undefined,
      version: (identity?.version || 1) - idx,
    }));

    // Construir relacionamentos entre contribuições
    const relationships: ContributionRelationship[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < nodes.length; i++) {
      const current = nodes[i];

      // Sequência: contribuição → contribuição anterior
      if (current.previousContributionId) {
        const key = `${current.previousContributionId}→${current.contributionId}`;
        if (!processed.has(key)) {
          processed.add(key);
          relationships.push({
            from: current.previousContributionId,
            to: current.contributionId,
            relationType: 'sequence',
            weight: 0.9,
          });
        }
      }

      // Contribuições que compartilham o mesmo objeto
      for (let j = i + 1; j < nodes.length; j++) {
        const other = nodes[j];
        if (current.objectId && current.objectId === other.objectId) {
          const key = [current.contributionId, other.contributionId].sort().join('|');
          if (!processed.has(key)) {
            processed.add(key);
            relationships.push({
              from: current.contributionId,
              to: other.contributionId,
              relationType: 'object_shared',
              weight: 0.65,
            });
          }
        }
        if (current.sourceId && current.sourceId === other.sourceId) {
          const key = [current.contributionId, other.contributionId].sort().join('|s');
          if (!processed.has(key)) {
            processed.add(key);
            relationships.push({
              from: current.contributionId,
              to: other.contributionId,
              relationType: 'source_shared',
              weight: 0.55,
            });
          }
        }
      }
    }

    const stats = {
      totalContributions: nodes.length,
      totalTags: 1,
      totalObjects: new Set(nodes.map(n => n.objectId).filter(Boolean)).size,
      totalSources: new Set(nodes.map(n => n.sourceId).filter(Boolean)).size,
      contributorCount: new Set(nodes.map(n => n.contributorHash).filter(Boolean)).size,
    };

    return { nodes, relationships, stats };
  } catch (err) {
    console.warn('[ContributionNetwork] Erro ao carregar rede:', err instanceof Error ? err.message : err);
    return { nodes: [], relationships: [], stats: { totalContributions: 0, totalTags: 0, totalObjects: 0, totalSources: 0, contributorCount: 0 } };
  }
}

/**
 * Carrega a rede global de contribuições (todas as tags).
 * Útil para exibição no grafo de interoperabilidade.
 */
export async function loadGlobalContributionNetwork(limit = 200): Promise<ContributionNetwork> {
  try {
    const { data: contributions, error } = await supabaseAdmin
      .from('tag_contributions')
      .select(`
        contribution_id, tag_id, object_id, source_id, previous_contribution_id,
        timestamp, contribution_type, content, previous_state, current_state,
        digest, relationships, contributor_hash
      `)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Obter labels das tags
    const tagIds = [...new Set((contributions || []).map(c => c.tag_id))];
    let tagLabels: Record<string, string> = {};
    let tagVersions: Record<string, number> = {};
    if (tagIds.length > 0) {
      const { data: identities } = await supabaseAdmin
        .from('tag_identities')
        .select('tag_id, tag, version')
        .in('tag_id', tagIds);
      tagLabels = Object.fromEntries((identities || []).map(i => [i.tag_id, i.tag]));
      tagVersions = Object.fromEntries((identities || []).map(i => [i.tag_id, i.version]));
    }

    const nodes: ContributionNode[] = (contributions || []).map(c => ({
      contributionId: c.contribution_id,
      tagId: c.tag_id,
      tagLabel: tagLabels[c.tag_id] || c.tag_id,
      objectId: c.object_id || undefined,
      sourceId: c.source_id || undefined,
      previousContributionId: c.previous_contribution_id || undefined,
      timestamp: c.timestamp,
      type: c.contribution_type as ContributionType,
      content: c.content || undefined,
      previousState: c.previous_state || undefined,
      currentState: c.current_state,
      digest: c.digest,
      relationships: Array.isArray(c.relationships) ? c.relationships : [],
      contributorHash: c.contributor_hash || undefined,
      version: tagVersions[c.tag_id] || 1,
    }));

    const relationships: ContributionRelationship[] = [];
    const processed = new Set<string>();
    const tagToContribs = new Map<string, string[]>();
    const objToContribs = new Map<string, string[]>();

    for (const node of nodes) {
      if (!tagToContribs.has(node.tagId)) tagToContribs.set(node.tagId, []);
      tagToContribs.get(node.tagId)!.push(node.contributionId);
      if (node.objectId) {
        if (!objToContribs.has(node.objectId)) objToContribs.set(node.objectId, []);
        objToContribs.get(node.objectId)!.push(node.contributionId);
      }
      if (node.previousContributionId) {
        const key = `${node.previousContributionId}→${node.contributionId}`;
        if (!processed.has(key)) {
          processed.add(key);
          relationships.push({ from: node.previousContributionId, to: node.contributionId, relationType: 'sequence', weight: 0.9 });
        }
      }
    }

    // Contribuições que compartilham tag
    for (const [, contribs] of tagToContribs) {
      for (let i = 0; i < contribs.length && i < 5; i++) {
        for (let j = i + 1; j < contribs.length && j < 5; j++) {
          const key = [contribs[i], contribs[j]].sort().join('|t');
          if (!processed.has(key)) {
            processed.add(key);
            relationships.push({ from: contribs[i], to: contribs[j], relationType: 'tag_shared', weight: 0.75 });
          }
        }
      }
    }

    const stats = {
      totalContributions: nodes.length,
      totalTags: tagToContribs.size,
      totalObjects: objToContribs.size,
      totalSources: new Set(nodes.map(n => n.sourceId).filter(Boolean)).size,
      contributorCount: new Set(nodes.map(n => n.contributorHash).filter(Boolean)).size,
    };

    return { nodes, relationships, stats };
  } catch (err) {
    console.warn('[ContributionNetwork] Erro ao carregar rede global:', err instanceof Error ? err.message : err);
    return { nodes: [], relationships: [], stats: { totalContributions: 0, totalTags: 0, totalObjects: 0, totalSources: 0, contributorCount: 0 } };
  }
}
