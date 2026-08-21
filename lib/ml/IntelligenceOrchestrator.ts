import { BrasilianaConnector } from '@/lib/connectors/brasiliana';
import { EuropeanaConnector } from '@/lib/connectors/europeana';
import { IbramConnector } from '@/lib/connectors/ibram';
import { supabaseAdmin } from '@/lib/supabase/client';
import { CULTURAL_VAULT_REGISTRY } from '@/app/api/interop/live-vault/registry';
import { BrazilianCultureArchitect } from './cultural-architect';
import { createSemanticEmbedding } from './embeddings';
import { cosineSimilarity } from './similarity';
import { normalizeForComparison } from './tag-correlator';

type TagRecord = { id: string; label: string; uses: number; source: string };
type GraphNode = TagRecord & { eixo: string; familia: string; fill: string; embedding?: number[]; evidence?: any[] };

const COLORS: Record<string, string> = { FESTA: '#1E3A8A', MUSICA: '#0891B2', SABERES: '#1A6B3A', CRENCAS: '#6D28D9', PATRIMONIO: '#E8A920' };
const NOISE = /(^|\s)(oi|eu|m|o|test|teste|asdf|foo|bar|baz|null|undefined)(\s|$)|test|teste|asdf|lorem|ipsum/i;
const validTag = (value: unknown): value is string => typeof value === 'string' && value.trim().length >= 3 && !NOISE.test(value) && !/^\d+$/.test(value.trim());
const idFor = (label: string) => normalizeForComparison(label).replace(/\s+/g, '_');

function profileFor(label: string) {
  const canonical = CULTURAL_VAULT_REGISTRY[idFor(label)];
  const profile = BrazilianCultureArchitect.getCulturalProfile(label);
  const eixo = canonical?.eixo || (profile.axes[0] === 'FESTAS_CELEBRACOES' ? 'FESTA' : profile.axes[0] === 'MUSICA_DANCA_PERFORMANCE' ? 'MUSICA' : profile.axes[0] === 'CRENCAS_RITOS' ? 'CRENCAS' : 'SABERES');
  return { eixo, familia: canonical?.familia || `${eixo.toLowerCase()}.${idFor(label)}`, fill: canonical?.cor || COLORS[eixo] || COLORS.PATRIMONIO };
}

async function readUserTags(): Promise<TagRecord[]> {
  const tags = new Map<string, TagRecord>();
  const add = (raw: unknown, id: unknown, source: string) => {
    if (!validTag(raw)) return;
    const label = raw.trim();
    const key = normalizeForComparison(label);
    const existing = tags.get(key);
    if (existing) existing.uses += 1;
    else tags.set(key, { id: String(id || idFor(label)), label, uses: 1, source });
  };

  const results = await Promise.allSettled([
    supabaseAdmin.from('tags').select('id, tag_original, tag_normalizada, criado_em'),
    supabaseAdmin.from('nucleos').select('id, conteudo_original, tipo, criado_em')
  ]);
  for (const result of results) {
    if (result.status !== 'fulfilled' || result.value.error) continue;
    for (const row of result.value.data || []) add(row.tag_original || row.tag_normalizada || row.conteudo_original, row.id, row.tipo === 'tag' ? 'nucleos' : 'tags');
  }
  for (const item of Object.values(CULTURAL_VAULT_REGISTRY)) add(item.tag, item.id, 'cofre');
  return [...tags.values()];
}

export class IntelligenceOrchestrator {
  private nodes = new Map<string, GraphNode>();
  private edges: any[] = [];
  private loaded = false;

  private async loadAll() {
    if (this.loaded) return;
    this.nodes.clear();
    this.edges = [];
    const tags = await readUserTags();
    for (const tag of tags) this.nodes.set(idFor(tag.label), { ...tag, ...profileFor(tag.label) });
    const entries = [...this.nodes.values()];
    const vectors = await Promise.all(entries.map(node => createSemanticEmbedding(node.label).then(result => result.vector)));
    entries.forEach((node, index) => { node.embedding = vectors[index]; });
    for (let left = 0; left < entries.length; left += 1) {
      for (let right = left + 1; right < entries.length; right += 1) {
        const a = entries[left];
        const b = entries[right];
        const cohesion = BrazilianCultureArchitect.calculateCohesion(a.label, b.label);
        const similarity = cosineSimilarity(a.embedding || [], b.embedding || []);
        if (cohesion >= 0.5 || similarity >= 0.62) this.edges.push({ from: a.id, to: b.id, weight: Math.round((similarity * 0.65 + cohesion * 0.35) * 100) / 100, discovered: similarity >= 0.62 && cohesion < 0.7, mechanism: 'semantic_correlation' });
      }
    }
    this.loaded = true;
  }

  public async getNetworkView(tagLabel: string) {
    await this.loadAll();
    const selected = idFor(tagLabel) === 'geral' ? undefined : idFor(tagLabel);
    const nodes = [...this.nodes.values()].map((node, index) => ({ ...node, x: 400 + Math.cos(index) * (index < 8 ? 165 : 220), y: 215 + Math.sin(index) * (index < 8 ? 145 : 220), size: node.id === selected ? 20 : 13, activation: node.id === selected ? 1 : 0.35, type: node.source === 'cofre' ? 'Tag Preservada' : 'Tag do Usuário', desc: `Tag usada ${node.uses} vez(es); família ${node.familia}` }));
    const selectedNode = selected ? this.nodes.get(selected) : undefined;
    const canonical = selectedNode ? CULTURAL_VAULT_REGISTRY[selectedNode.id] : undefined;
    return { nodes, connections: this.edges, total: nodes.length, totalConnections: this.edges.length, selectedId: selected, dossier: canonical || selectedNode };
  }

  public async processAndEnrichTag(tagLabel: string) {
    await this.loadAll();
    const node = this.nodes.get(idFor(tagLabel)) || { id: idFor(tagLabel), label: tagLabel, uses: 1, source: 'nova-tag', ...profileFor(tagLabel) };
    this.nodes.set(node.id, node);
    const [brasiliana, europeana, ibram] = await Promise.all([
      new BrasilianaConnector().searchExternalSource(tagLabel),
      new EuropeanaConnector().searchExternalSource(tagLabel),
      new IbramConnector().searchExternalSource(tagLabel)
    ]);
    node.evidence = [...brasiliana, ...europeana, ...ibram].slice(0, 20);
    node.embedding = (await createSemanticEmbedding(`${tagLabel} ${node.evidence.map(item => item.title).join(' ')}`)).vector;
    this.loaded = false;
    return { ...node, externalData: node.evidence };
  }
}

export const orchestrator = new IntelligenceOrchestrator();
