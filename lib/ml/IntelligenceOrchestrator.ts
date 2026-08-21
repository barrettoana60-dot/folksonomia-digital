/**
 * Projection of the cultural interoperability graph.
 *
 * Every request reads the source of truth. Tags are grouped only by their
 * normalized form; their spellings, records, works, nuclei and evidence remain
 * available as provenance instead of being replaced by demonstration data.
 */

import crypto from 'crypto';
import { BrasilianaConnector } from '@/lib/connectors/brasiliana';
import { EuropeanaConnector } from '@/lib/connectors/europeana';
import { IbramConnector } from '@/lib/connectors/ibram';
import type { ExternalMatch } from '@/lib/connectors/types';
import { supabaseAdmin } from '@/lib/supabase/client';
import { BrazilianCultureArchitect } from './cultural-architect';
import { normalizeForComparison } from './tag-correlator';

export type InteropNodeKind = 'tag' | 'work' | 'document' | 'family';

export interface InteropNode {
  id: string;
  kind: InteropNodeKind;
  label: string;
  description?: string;
  color: string;
  eixo?: string;
  family?: string;
  dna?: string;
  source?: string;
  url?: string;
  usageCount?: number;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface InteropEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  explanation: string;
  confidence: number;
  layer: 'factual' | 'inferred' | 'validated';
  mechanism: string;
  source?: string;
  discovered?: boolean;
}

export interface InteropDossier {
  tag: string;
  dna: string;
  aliases: string[];
  family: string;
  axes: string[];
  occurrenceCount: number;
  provenance: { firstObservedAt?: string; tagRecords: number; works: number; nuclei: number; dataSources: string[] };
  relations: Array<InteropEdge & { target: Pick<InteropNode, 'id' | 'kind' | 'label' | 'url' | 'source'> }>;
  evidence: Array<Pick<InteropNode, 'id' | 'label' | 'description' | 'source' | 'url' | 'confidence'>>;
}

type TagRow = { id: string; tag_original?: string; tag_normalizada?: string; grupo_tematico?: string; status?: string; obra_id?: string; nucleo_id?: string; criado_em?: string; created_at?: string };
type TagAggregate = {
  id: string; dna: string; normalized: string; label: string; aliases: Set<string>; recordIds: Set<string>;
  workIds: Set<string>; nucleoIds: Set<string>; themes: Set<string>; statuses: Set<string>; firstObservedAt?: string;
  eixo: string; family: string; color: string;
};

const COLORS: Record<string, string> = { FESTA: '#1E3A8A', MUSICA: '#0891B2', SABERES: '#1A6B3A', CRENCAS: '#6D28D9', PATRIMONIO: '#B7791F' };
const AXIS_LABELS: Record<string, string> = {
  FESTA: 'Festas e celebrações', MUSICA: 'Música, dança e performance', SABERES: 'Saberes, ofícios e materiais',
  CRENCAS: 'Crenças e ritos', PATRIMONIO: 'Tradição oral e patrimônio',
};
const NOISE = /(^|\s)(oi|eu|m|o|test|teste|asdf|foo|bar|baz|null|undefined)(\s|$)|test|teste|asdf|lorem|ipsum/i;
const STOP_WORDS = new Set(['para', 'com', 'uma', 'uns', 'das', 'dos', 'que', 'por', 'sem', 'nos', 'nas', 'sobre', 'entre', 'arte', 'cultural']);

function isValidTag(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 3 && !NOISE.test(value.trim()) && !/^\d+$/.test(value.trim());
}
function normalizeTag(value: string): string { return normalizeForComparison(value).replace(/\s+/g, ' ').trim(); }

/**
 * Stable public DNA code. It is an opaque HMAC when INTEROP_DNA_KEY (or the
 * app encryption key) is configured; otherwise it is a deterministic public
 * fingerprint and must not be described as encrypted.
 */
export function makeTagDna(normalizedTag: string): string {
  const material = `folksonomia/interoperability/v1/${normalizedTag}`;
  const key = process.env.INTEROP_DNA_KEY || process.env.ENCRYPTION_KEY || process.env.CHAVE_DE_CRIPTURA;
  const digest = key
    ? crypto.createHmac('sha256', key).update(material).digest('hex')
    : crypto.createHash('sha256').update(material).digest('hex');
  return `FDNA1${digest.slice(0, 22).toUpperCase()}`;
}
function workNodeId(workId: string): string { return `WORK${crypto.createHash('sha256').update(workId).digest('hex').slice(0, 16).toUpperCase()}`; }
function documentNodeId(source: string, externalId: string): string { return `DOC${crypto.createHash('sha256').update(`${source}:${externalId}`).digest('hex').slice(0, 16).toUpperCase()}`; }
function familyNodeId(eixo: string): string { return `FAMILY${eixo}`; }

function profileFor(label: string, themes: Set<string>) {
  const profile = BrazilianCultureArchitect.getCulturalProfile(label);
  const eixo = profile.axes.includes('FESTAS_CELEBRACOES') ? 'FESTA'
    : profile.axes.includes('MUSICA_DANCA_PERFORMANCE') ? 'MUSICA'
      : profile.axes.includes('CRENCAS_RITOS') ? 'CRENCAS'
        : profile.axes.includes('SABERES_OFICIOS_MATERIAIS') ? 'SABERES' : 'PATRIMONIO';
  return { eixo, family: [...themes].find(Boolean) || AXIS_LABELS[eixo], color: COLORS[eixo], axes: profile.axes };
}

async function selectAll(table: string, fields: string): Promise<any[]> {
  const all: any[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin.from(table).select(fields).range(from, from + pageSize - 1);
    if (error) return all;
    const page = data || [];
    all.push(...page);
    if (page.length < pageSize) return all;
  }
}

async function readGraphSource() {
  const [tags, works, externalResults, correlations, relations] = await Promise.all([
    selectAll('tags', 'id, tag_original, tag_normalizada, grupo_tematico, status, obra_id, nucleo_id, criado_em'),
    selectAll('obras', 'id, titulo, artista, ano, descricao, material, tecnica, origem, imagem_url, publicado, criado_em'),
    selectAll('resultados_externos', 'id, nucleo_id, fonte, external_id, titulo, descricao, url, rights, provider, match_score, tipo_relacao, status, criado_em'),
    selectAll('semantic_correlations', 'tag_normalizada, source, external_id, external_title, correlation_score, correlation_reasons, layer, updated_at'),
    selectAll('relacoes', 'id, origem_id, destino_id, destino_externo, tipo_relacao, peso, metodo, fonte, status, metadados, criado_em'),
  ]);
  return { tags: tags as TagRow[], works, externalResults, correlations, relations };
}

function aggregateTags(rows: TagRow[]): Map<string, TagAggregate> {
  const aggregates = new Map<string, TagAggregate>();
  for (const row of rows) {
    const original = row.tag_original || row.tag_normalizada;
    if (!isValidTag(original)) continue;
    const normalized = normalizeTag(row.tag_normalizada || original);
    if (!normalized) continue;
    let aggregate = aggregates.get(normalized);
    if (!aggregate) {
      const themes = new Set<string>();
      if (row.grupo_tematico?.trim()) themes.add(row.grupo_tematico.trim());
      const profile = profileFor(original.trim(), themes);
      aggregate = {
        id: makeTagDna(normalized), dna: makeTagDna(normalized), normalized, label: original.trim(), aliases: new Set(),
        recordIds: new Set(), workIds: new Set(), nucleoIds: new Set(), themes, statuses: new Set(),
        firstObservedAt: row.criado_em || row.created_at, eixo: profile.eixo, family: profile.family, color: profile.color,
      };
      aggregates.set(normalized, aggregate);
    }
    aggregate.aliases.add(original.trim());
    aggregate.recordIds.add(String(row.id));
    if (row.obra_id) aggregate.workIds.add(String(row.obra_id));
    if (row.nucleo_id) aggregate.nucleoIds.add(String(row.nucleo_id));
    if (row.grupo_tematico?.trim()) aggregate.themes.add(row.grupo_tematico.trim());
    if (row.status?.trim()) aggregate.statuses.add(row.status.trim());
    const observed = row.criado_em || row.created_at;
    if (observed && (!aggregate.firstObservedAt || observed < aggregate.firstObservedAt)) aggregate.firstObservedAt = observed;
  }
  for (const aggregate of aggregates.values()) {
    const profile = profileFor(aggregate.label, aggregate.themes);
    aggregate.eixo = profile.eixo;
    aggregate.family = profile.family;
    aggregate.color = profile.color;
    aggregate.label = [...aggregate.aliases].sort((a, b) => a.localeCompare(b, 'pt-BR'))[0] || aggregate.label;
  }
  return aggregates;
}

function addEdge(edges: Map<string, InteropEdge>, edge: Omit<InteropEdge, 'id'>) {
  if (edge.from === edge.to) return;
  const key = `${edge.from}|${edge.to}|${edge.relation}`;
  const existing = edges.get(key);
  if (!existing || existing.confidence < edge.confidence) {
    edges.set(key, { ...edge, id: crypto.createHash('sha256').update(key).digest('hex').slice(0, 24) });
  }
}
function tokensFor(value: string): string[] { return [...new Set(normalizeTag(value).split(' ').filter(token => token.length >= 4 && !STOP_WORDS.has(token)))]; }

function addInferredTagLinks(aggregates: TagAggregate[], edges: Map<string, InteropEdge>) {
  const candidates = new Map<string, Map<string, { score: number; reason: string }>>();
  const record = (from: TagAggregate, to: TagAggregate, score: number, reason: string) => {
    if (from.id === to.id) return;
    const list = candidates.get(from.id) || new Map<string, { score: number; reason: string }>();
    const current = list.get(to.id);
    if (!current || score > current.score) list.set(to.id, { score, reason });
    candidates.set(from.id, list);
  };
  const tokenIndex = new Map<string, TagAggregate[]>();
  for (const aggregate of aggregates) {
    for (const token of tokensFor(`${aggregate.label} ${[...aggregate.aliases].join(' ')}`)) tokenIndex.set(token, [...(tokenIndex.get(token) || []), aggregate]);
  }
  for (const [token, members] of tokenIndex) {
    // Common vocabulary belongs to a family path, not to a fabricated clique.
    if (members.length > 80) continue;
    for (let left = 0; left < members.length; left += 1) {
      for (let right = left + 1; right < members.length; right += 1) {
        const score = Math.min(0.88, 0.58 + Math.min(token.length, 12) / 40);
        record(members[left], members[right], score, `Compartilham o marcador cultural “${token}”.`);
        record(members[right], members[left], score, `Compartilham o marcador cultural “${token}”.`);
      }
    }
  }
  const themeIndex = new Map<string, TagAggregate[]>();
  for (const aggregate of aggregates) for (const theme of aggregate.themes) {
    const key = normalizeTag(theme);
    if (key) themeIndex.set(key, [...(themeIndex.get(key) || []), aggregate]);
  }
  for (const [theme, members] of themeIndex) {
    const sorted = [...members].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    for (let index = 0; index < sorted.length; index += 1) for (const peer of sorted.slice(index + 1, index + 4)) {
      record(sorted[index], peer, 0.55, `Compartilham o agrupamento temático informado: ${theme}.`);
      record(peer, sorted[index], 0.55, `Compartilham o agrupamento temático informado: ${theme}.`);
    }
  }
  for (const [fromId, matches] of candidates) {
    [...matches.entries()].sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0])).slice(0, 6).forEach(([toId, value]) => {
      addEdge(edges, { from: fromId, to: toId, relation: 'semantic_related', explanation: value.reason, confidence: Number(value.score.toFixed(2)), layer: 'inferred', mechanism: 'semantic-index', source: 'tags', discovered: true });
    });
  }
}

function nodeFromAggregate(aggregate: TagAggregate): InteropNode {
  return {
    id: aggregate.id, kind: 'tag', label: aggregate.label, color: aggregate.color, eixo: aggregate.eixo, family: aggregate.family, dna: aggregate.dna,
    description: `${aggregate.recordIds.size} ocorrência(s), ${aggregate.workIds.size} obra(s) e ${aggregate.nucleoIds.size} núcleo(s) de proveniência.`,
    usageCount: aggregate.recordIds.size, metadata: { aliases: [...aggregate.aliases].sort((a, b) => a.localeCompare(b, 'pt-BR')) },
  };
}

async function persistIdentities(aggregates: TagAggregate[]) {
  if (!aggregates.length) return;
  try {
    await supabaseAdmin.from('interoperability_tag_identities').upsert(aggregates.map(aggregate => ({
      tag_key: aggregate.normalized, dna_code: aggregate.dna, canonical_label: aggregate.label, aliases: [...aggregate.aliases],
      provenance: { tag_records: aggregate.recordIds.size, works: aggregate.workIds.size, nuclei: aggregate.nucleoIds.size, first_observed_at: aggregate.firstObservedAt },
      updated_at: new Date().toISOString(),
    })), { onConflict: 'tag_key' });
  } catch { /* Migration can be deployed independently of the read-only projection. */ }
}

function createDossier(selected: TagAggregate | undefined, nodes: InteropNode[], edges: InteropEdge[]): InteropDossier | undefined {
  if (!selected) return undefined;
  const byId = new Map(nodes.map(node => [node.id, node]));
  const relations = edges.filter(edge => edge.from === selected.id || edge.to === selected.id).map(edge => ({
    ...edge, target: byId.get(edge.from === selected.id ? edge.to : edge.from),
  })).filter((relation): relation is InteropEdge & { target: Pick<InteropNode, 'id' | 'kind' | 'label' | 'url' | 'source'> } => Boolean(relation.target))
    .sort((a, b) => b.confidence - a.confidence || a.target.label.localeCompare(b.target.label, 'pt-BR'));
  const evidence = relations.filter(relation => relation.target.kind === 'document').map(relation => ({
    id: relation.target.id, label: relation.target.label, source: relation.target.source, url: relation.target.url, confidence: relation.confidence,
    description: byId.get(relation.target.id)?.description,
  }));
  const dataSources = [...new Set([
    'tags',
    ...(selected.workIds.size ? ['obras'] : []),
    ...evidence.map(item => item.source).filter((source): source is string => Boolean(source)),
  ])];
  return {
    tag: selected.label, dna: selected.dna, aliases: [...selected.aliases].sort((a, b) => a.localeCompare(b, 'pt-BR')), family: selected.family,
    axes: profileFor(selected.label, selected.themes).axes, occurrenceCount: selected.recordIds.size,
    provenance: {
      firstObservedAt: selected.firstObservedAt, tagRecords: selected.recordIds.size, works: selected.workIds.size, nuclei: selected.nucleoIds.size,
      dataSources,
    }, relations, evidence,
  };
}

export class IntelligenceOrchestrator {
  public async getNetworkView(tagLabel?: string) {
    const source = await readGraphSource();
    const aggregateMap = aggregateTags(source.tags);
    const aggregates = [...aggregateMap.values()];
    void persistIdentities(aggregates);
    const nodes = aggregates.map(nodeFromAggregate);
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const edges = new Map<string, InteropEdge>();
    const byNucleo = new Map<string, TagAggregate>();
    const byWork = new Map(source.works.map((work: any) => [String(work.id), work]));

    for (const aggregate of aggregates) {
      const familyId = familyNodeId(aggregate.eixo);
      if (!nodeById.has(familyId)) {
        const familyNode: InteropNode = { id: familyId, kind: 'family', label: AXIS_LABELS[aggregate.eixo], color: aggregate.color, eixo: aggregate.eixo, description: 'Família cultural inferida a partir do vocabulário e das classificações do acervo.' };
        nodes.push(familyNode); nodeById.set(familyId, familyNode);
      }
      addEdge(edges, { from: aggregate.id, to: familyId, relation: 'classified_in', explanation: `A tag integra a família “${AXIS_LABELS[aggregate.eixo]}”.`, confidence: 0.72, layer: 'inferred', mechanism: 'cultural-profile', source: 'tag-text', discovered: true });
      for (const nucleoId of aggregate.nucleoIds) byNucleo.set(nucleoId, aggregate);
      for (const workId of aggregate.workIds) {
        const work = byWork.get(workId); const publicId = workNodeId(workId);
        if (!nodeById.has(publicId)) {
          const workNode: InteropNode = {
            id: publicId, kind: 'work', label: work?.titulo || 'Obra sem título catalogado', color: '#E8490A', source: 'Acervo interno',
            description: [work?.artista, work?.ano, work?.descricao].filter(Boolean).join(' · ') || 'Registro de obra conectado à tag.',
            metadata: { material: work?.material, tecnica: work?.tecnica, origem: work?.origem, imagemUrl: work?.imagem_url },
          };
          nodes.push(workNode); nodeById.set(publicId, workNode);
        }
        addEdge(edges, { from: aggregate.id, to: publicId, relation: 'tagged_in', explanation: `A tag foi registrada na obra “${nodeById.get(publicId)?.label}”.`, confidence: 1, layer: 'factual', mechanism: 'user-tag', source: 'tags' });
      }
    }

    const addDocument = (aggregate: TagAggregate, evidence: { source?: string; externalId?: string; title?: string; description?: string; url?: string; score?: number; relation?: string; layer?: 'factual' | 'inferred' | 'validated' }) => {
      const sourceName = evidence.source || 'Fonte externa';
      const externalId = evidence.externalId || evidence.title || `${aggregate.normalized}:${sourceName}`;
      const id = documentNodeId(sourceName, externalId);
      if (!nodeById.has(id)) {
        const documentNode: InteropNode = { id, kind: 'document', label: evidence.title || 'Documento sem título', color: '#C0841A', source: sourceName, url: evidence.url, confidence: evidence.score, description: evidence.description || `Registro recuperado de ${sourceName}.` };
        nodes.push(documentNode); nodeById.set(id, documentNode);
      }
      addEdge(edges, { from: aggregate.id, to: id, relation: evidence.relation || 'documented_by', explanation: `Evidência recuperada em ${sourceName}: “${evidence.title || 'registro sem título'}”.`, confidence: Math.max(0.1, Math.min(1, evidence.score ?? 0.6)), layer: evidence.layer || 'inferred', mechanism: 'retrieval', source: sourceName, discovered: true });
    };
    for (const result of source.externalResults) {
      const aggregate = byNucleo.get(String(result.nucleo_id)); if (!aggregate) continue;
      addDocument(aggregate, { source: result.fonte, externalId: result.external_id, title: result.titulo, description: result.descricao, url: result.url, score: Number(result.match_score || 0.6), relation: result.tipo_relacao || 'documented_by', layer: result.status === 'aprovado' ? 'validated' : 'inferred' });
    }
    for (const correlation of source.correlations) {
      const aggregate = aggregateMap.get(normalizeTag(correlation.tag_normalizada || '')); if (!aggregate) continue;
      const retrieval = Array.isArray(correlation.correlation_reasons)
        ? correlation.correlation_reasons.find((reason: any) => reason?.type === 'retrieval') : undefined;
      addDocument(aggregate, { source: correlation.source, externalId: correlation.external_id, title: correlation.external_title, description: retrieval?.external_description, url: retrieval?.url, score: Number(correlation.correlation_score || 0.6), layer: correlation.layer === 'validated' ? 'validated' : correlation.layer === 'factual' ? 'factual' : 'inferred' });
    }
    for (const relation of source.relations) {
      const from = byNucleo.get(String(relation.origem_id)); const to = byNucleo.get(String(relation.destino_id));
      if (!from || !to) continue;
      addEdge(edges, { from: from.id, to: to.id, relation: relation.tipo_relacao || 'related_to', explanation: relation.metadados?.explicacao || relation.metadados?.reason || `Relação registrada por ${relation.metodo || 'curadoria'}.`, confidence: Number(relation.peso || 0.6), layer: relation.status === 'validada' || relation.status === 'aprovada' ? 'validated' : 'factual', mechanism: relation.metodo || 'curator', source: relation.fonte || 'relacoes' });
    }
    addInferredTagLinks(aggregates, edges);

    const selected = tagLabel ? aggregateMap.get(normalizeTag(tagLabel)) : undefined;
    const activeAggregate = tagLabel ? selected : aggregates[0];
    const edgeList = [...edges.values()];
    const dossier = createDossier(activeAggregate, nodes, edgeList);
    const documentNodes = nodes.filter(node => node.kind === 'document');
    return {
      nodes, connections: edgeList, selectedId: activeAggregate?.id, dossier,
      metrics: {
        distinctTags: aggregates.length, tagOccurrences: source.tags.filter(row => isValidTag(row.tag_original || row.tag_normalizada)).length,
        works: nodes.filter(node => node.kind === 'work').length, documents: documentNodes.length, families: nodes.filter(node => node.kind === 'family').length,
        relations: edgeList.length, sources: [...new Set(documentNodes.map(node => node.source).filter(Boolean))],
        dnaMode: process.env.INTEROP_DNA_KEY || process.env.ENCRYPTION_KEY || process.env.CHAVE_DE_CRIPTURA ? 'hmac' : 'fingerprint',
      },
    };
  }

  public async processAndEnrichTag(tagLabel: string) {
    const normalized = normalizeTag(tagLabel);
    const current = await this.getNetworkView(tagLabel);
    const selected = current.dossier;
    if (!selected || normalizeTag(selected.tag) !== normalized) throw new Error('A tag precisa existir no acervo antes de ser enriquecida.');
    const connectors = [new BrasilianaConnector(), new IbramConnector(), new EuropeanaConnector()];
    const settled = await Promise.allSettled(connectors.map(connector => connector.searchExternalSource(selected.tag)));
    const matches = settled.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    await this.persistRetrievedEvidence(normalized, matches);
    const updated = await this.getNetworkView(selected.tag);
    if (updated.dossier) await this.persistRelationLedger(updated.dossier);
    return updated;
  }

  private async persistRetrievedEvidence(normalizedTag: string, matches: ExternalMatch[]) {
    const unique = new Map<string, ExternalMatch>();
    for (const match of matches) unique.set(`${match.source}:${match.external_id}`, match);
    if (!unique.size) return;
    try {
      await supabaseAdmin.from('semantic_correlations').upsert([...unique.values()].map(match => ({
        tag_normalizada: normalizedTag, source: match.source, external_id: match.external_id, external_title: match.title, correlation_score: match.match_score,
        correlation_reasons: [{ type: 'retrieval', match: match.title, description: `Recuperado de ${match.source}.`, external_description: match.description, url: match.url, provider: match.provider, rights: match.rights }], layer: 'inferred', updated_at: new Date().toISOString(),
      })), { onConflict: 'tag_normalizada,source,external_id' });
      await supabaseAdmin.from('tag_learning_history').insert({ tag_normalizada: normalizedTag, event_type: 'interoperability_retrieval', event_details: { sources: [...new Set(matches.map(match => match.source))], matches: unique.size, at: new Date().toISOString() } });
    } catch { /* A read-only graph continues to work if persistence is temporarily unavailable. */ }
  }

  private async persistRelationLedger(dossier: InteropDossier) {
    try {
      await supabaseAdmin.from('interoperability_tag_identities').upsert({
        tag_key: normalizeTag(dossier.tag),
        dna_code: dossier.dna,
        canonical_label: dossier.tag,
        aliases: dossier.aliases,
        provenance: dossier.provenance,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tag_key' });
      const relations = dossier.relations.map(relation => ({
        relation_key: relation.id,
        // The ledger records the tag currently being observed; this guarantees
        // its referenced identity exists even for an incoming curator relation.
        source_dna: dossier.dna,
        target_id: relation.target.id,
        relation_type: relation.relation,
        confidence: relation.confidence,
        layer: relation.layer,
        mechanism: relation.mechanism,
        explanation: relation.explanation,
        provenance: { source: relation.source, discovered: relation.discovered, target_kind: relation.target.kind },
        last_seen_at: new Date().toISOString(),
      }));
      if (relations.length) await supabaseAdmin.from('interoperability_relation_ledger').upsert(relations, { onConflict: 'relation_key' });
    } catch {
      // The ledger is an audit enhancement; failure must not hide the live graph.
    }
  }
}

export const orchestrator = new IntelligenceOrchestrator();
