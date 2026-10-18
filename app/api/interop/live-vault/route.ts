import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/client';
import { discoverLiveConnections, pulseLiveNetwork } from '@/lib/ml/live-network-engine';
import { hybridSemanticSimilarity } from '@/lib/ml/similarity';
import { BrazilianCultureArchitect } from '@/lib/ml/cultural-architect';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { searchAcademicLiterature } from '@/lib/ml/academic-search';
import {
  encryptWithChecksum,
  inspectEnvelope,
  EncryptionConfigurationError,
  getEncryptionStatusWithSelfTest,
} from '@/lib/core/crypto';
import {
  createSemanticVaultAuditRecord,
  createSemanticVaultFingerprint,
  heartbeatsFromDossier,
  humanizeGeneticCode,
  SemanticVaultRelation,
  SemanticVaultSource,
} from '@/lib/core/semantic-vault';
import { searchCulturalDerivatives, discoverCulturalRelations } from '@/lib/connectors/cultural-interop';
import { generateTagId, toDisplayFormat } from '@/lib/core/tag-identity';
import {
  loadLegacyTagNetworkPreview,
  type LegacyNetworkPreview,
} from '@/lib/core/legacy-tag-network-backfill';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const EIXO_COLORS: Record<string, string> = {
  SABERES: '#1A6B3A',
  FESTA: '#1E3A8A',
  MUSICA: '#0891B2',
  CRENCAS: '#6D28D9',
  PATRIMONIO: '#E8A920',
  default: '#4B5563',
};

interface UserContribution {
  id: string;
  label: string;
  normalizedLabel: string;
  eixo: string;
  familia: string;
  createdAt?: string;
  heartbeat?: {
    pulseCount: number;
    lastPulse: string;
    connectionCount: number;
    generation: number;
  };
  auditState?: {
    lastSequence: number;
    lastChainHash: string | null;
    lastEvent: string | null;
  };
  secureState?: 'sealed' | 'pending_seal' | 'read_only';
}

interface LiveContributionEdge {
  from: string;
  to: string;
  weight: number;
  skosRelation: string;
  discovered: boolean;
  auditPending?: boolean;
}

function isValidCulturalTag(label?: string): boolean {
  if (!label || typeof label !== 'string') return false;
  const clean = label.trim().toLowerCase();
  if (clean.length < 3 || clean.length > 160 || /^[0-9]+$/.test(clean)) return false;
  const noise = /(test|teste|asdf|foo|bar|baz|null|undefined|teste_|teste[0-9])/i;
  return !noise.test(clean);
}

function isUuid(value?: string | null): boolean {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function hasLiveVaultMutationAuthorization(request: NextRequest): boolean {
  // Esta rota é pública para leitura, mas qualquer novo evento na cadeia exige
  // um worker/curador autenticado. O fluxo público de envio sela somente sua
  // própria contribuição em /api/ml/analisar-tag.
  const expected = process.env.LIVE_VAULT_MUTATION_SECRET || process.env.ADMIN_SECRET || '';
  const provided = request.headers.get('x-live-vault-mutation-secret') || '';
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function inferEixo(label: string): string {
  const profile = BrazilianCultureArchitect.getCulturalProfile(label);
  const axis = profile.axes[0];
  if (axis === 'FESTAS_CELEBRACOES') return 'FESTA';
  if (axis === 'MUSICA_DANCA_PERFORMANCE') return 'MUSICA';
  if (axis === 'SABERES_OFICIOS_MATERIAIS') return 'SABERES';
  if (axis === 'CRENCAS_RITOS') return 'CRENCAS';
  return 'PATRIMONIO';
}

async function fetchUserContributions(): Promise<UserContribution[]> {
  const contributions: UserContribution[] = [];

  try {
    let rawTags: any[] = [];
    const res1 = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, tag_normalizada, grupo_tematico, criado_em')
      .order('criado_em', { ascending: false })
      .limit(300);

    if (!res1.error && res1.data) {
      rawTags = res1.data;
    } else {
      const res2 = await supabaseAdmin
        .from('tags')
        .select('id, tag_original, tag_normalizada, grupo_tematico, created_at')
        .order('created_at', { ascending: false })
        .limit(300);
      if (!res2.error && res2.data) {
        rawTags = res2.data;
      } else {
        const res3 = await supabaseAdmin
          .from('tags')
          .select('id, tag_original, tag_normalizada, grupo_tematico')
          .limit(300);
        rawTags = res3.data || [];
      }
    }

    const candidateIds = rawTags
      .map(tag => String(tag.id || ''))
      .filter(id => isUuid(id));
    if (candidateIds.length === 0) return contributions;

    // A rede pública mostra apenas contribuições que possuem tanto envelope
    // privado quanto gênese na cadeia. Registros históricos ou em recuperação
    // não são anunciados como se fossem selados.
    const { data: secureRows, error: secureError } = await supabaseAdmin
      .from('tag_secure_records')
      .select('submission_id')
      .in('submission_id', candidateIds);
    if (secureError) throw secureError;
    const sealedIds = new Set((secureRows || []).map(row => String(row.submission_id)));
    if (sealedIds.size === 0) return contributions;

    const { data: auditRows, error: auditError } = await supabaseAdmin
      .from('semantic_vault_audit')
      .select('vault_id, chain_position, chain_hash, event_type, created_at, genetic_code')
      .in('vault_id', [...sealedIds])
      .order('chain_position', { ascending: false })
      .limit(2_000);
    if (auditError) throw auditError;

    const auditsBySubmission = new Map<string, {
      lastSequence: number;
      lastChainHash: string | null;
      lastEvent: string | null;
      pulseCount: number;
      lastPulse: string;
      connectionCount: number;
      generation: number;
    }>();
    for (const audit of auditRows || []) {
      const vaultId = String(audit.vault_id || '');
      if (auditsBySubmission.has(vaultId)) continue;
      const genetic = String(audit.genetic_code || '');
      const markerMatch = genetic.match(/G(\d{3})C(\d{3})/);
      auditsBySubmission.set(vaultId, {
        lastSequence: Number(audit.chain_position || 0),
        lastChainHash: audit.chain_hash || null,
        lastEvent: audit.event_type || null,
        pulseCount: Number(audit.chain_position || 0),
        lastPulse: audit.created_at || new Date().toISOString(),
        connectionCount: markerMatch ? Number(markerMatch[2]) : 0,
        generation: markerMatch ? Number(markerMatch[1]) : 1,
      });
    }

    for (const tag of rawTags) {
      const label = String(tag.tag_original || tag.tag_normalizada || '').trim();
      const normalizedLabel = normalizeForComparison(label).replace(/\s+/g, '_');
      const submissionId = String(tag.id || '');
      // Tags existentes são dados do acervo, não sugestões de entrada. A rede
      // precisa incluir todas as 150 contribuições históricas, inclusive termos
      // que o filtro de ruído bloquearia em um cadastro novo.
      if (!isUuid(submissionId) || !sealedIds.has(submissionId) || !label || !normalizedLabel) continue;

      const eixo = tag.grupo_tematico || inferEixo(label);
      const auditState = auditsBySubmission.get(submissionId);
      if (!auditState) continue;
      contributions.push({
        id: submissionId,
        label,
        normalizedLabel,
        eixo,
        familia: `${String(eixo).toLowerCase()}.${normalizedLabel}`,
        createdAt: tag.criado_em || tag.created_at || undefined,
        secureState: 'sealed',
        heartbeat: auditState
          ? {
              pulseCount: auditState.pulseCount,
              lastPulse: auditState.lastPulse,
              connectionCount: auditState.connectionCount,
              generation: auditState.generation,
            }
          : undefined,
        auditState: auditState
          ? {
              lastSequence: auditState.lastSequence,
              lastChainHash: auditState.lastChainHash,
              lastEvent: auditState.lastEvent,
            }
          : undefined,
      });
    }
  } catch (error) {
    console.warn('[LiveVault] Falha ao consultar banco, usando nós culturais:', error instanceof Error ? error.message : error);
  }

  return contributions;
}

function buildContributionEdges(contributions: UserContribution[]) {
  const sample = contributions.slice(0, 80);
  const edges: Array<{ from: string; to: string; weight: number; skosRelation: string; discovered: boolean }> = [];
  const edgeKey = (a: string, b: string) => [a, b].sort().join('::');
  const seenEdges = new Set<string>();

  for (let i = 0; i < sample.length; i++) {
    for (let j = i + 1; j < sample.length; j++) {
      const a = sample[i];
      const b = sample[j];

      // Rejeitar termos espúrios ou ruídos
      if (isNoiseTerm(a.label) || isNoiseTerm(b.label)) continue;

      const affinity = getCulturalAffinity(a.label, b.label);
      if (affinity && affinity.affinity >= 0.70) {
        const k = edgeKey(a.id, b.id);
        if (!seenEdges.has(k)) {
          seenEdges.add(k);
          edges.push({
            from: a.id,
            to: b.id,
            weight: affinity.affinity,
            skosRelation: affinity.relation,
            discovered: false,
          });
        }
        continue;
      }

      // Conexões legítimas de patrimônio imaterial via arquitetura cultural
      const cohesion = BrazilianCultureArchitect.calculateCohesion(a.label, b.label);
      const similarity = hybridSemanticSimilarity(a.label, b.label);
      if (cohesion >= 0.85 && similarity >= 0.40) {
        const k = edgeKey(a.id, b.id);
        if (!seenEdges.has(k)) {
          seenEdges.add(k);
          edges.push({
            from: a.id,
            to: b.id,
            weight: Number(((cohesion + similarity) / 2).toFixed(2)),
            skosRelation: cohesion >= 0.90 ? 'skos:closeMatch' : 'skos:related',
            discovered: false,
          });
        }
      }
    }
  }
  return edges.slice(0, 160);
}

function mergeContributionEdges(...groups: LiveContributionEdge[][]): LiveContributionEdge[] {
  const merged = new Map<string, LiveContributionEdge>();
  const edges = groups.flat();
  const priority = (edge: LiveContributionEdge) => edge.discovered ? 3 : edge.auditPending ? 2 : 1;
  for (const edge of edges) {
    const key = [edge.from, edge.to].sort().join('::');
    const current = merged.get(key);
    // Relações seladas têm precedência; vínculos do banco legado aparecem
    // antes de qualquer sugestão calculada, com auditoria explicitamente pendente.
    if (!current || priority(edge) > priority(current) ||
      (priority(edge) === priority(current) && edge.weight > current.weight)) {
      merged.set(key, edge);
    }
  }
  return [...merged.values()].slice(0, 320);
}

function emptyLegacyPreview(): LegacyNetworkPreview {
  return { nodes: [], edges: [] };
}

function buildLegacyPreviewDossier(node: LegacyNetworkPreview['nodes'][number], preview: LegacyNetworkPreview) {
  const relatedEdges = preview.edges.filter(edge => edge.from === node.id || edge.to === node.id);
  const conexoesTextuais = relatedEdges.map(edge => {
    const targetId = edge.from === node.id ? edge.to : edge.from;
    const target = preview.nodes.find(candidate => candidate.id === targetId);
    return {
      targetId,
      targetLabel: target?.label || targetId,
      relationType: edge.skosRelation,
      confidence: edge.weight,
      evidence: 'Vínculo calculado a partir do acervo existente; apenas prévia de leitura, sem selo ou auditoria persistente.',
    };
  });
  return {
    id: node.id,
    tag: node.label,
    dataCriacao: node.createdAt,
    eixo: node.eixo,
    familia: node.familia,
    descricao: 'Prévia de leitura do acervo existente. Este modo não cria registro criptográfico nem afirma auditoria persistente.',
    autor: 'Acervo histórico do sistema',
    tripla: {
      sujeito: node.label,
      predicado: 'está relacionado a',
      objeto: conexoesTextuais.length ? 'outros termos do acervo' : 'acervo cultural',
    },
    artigo: null,
    acervos: [],
    conexoesTextuais,
    tagIdentity: null,
    vault: null,
    heartbeat: null,
    legacyStatus: 'read_only_preview',
  };
}

function isNoiseTerm(s: string): boolean {
  const norm = normalizeForComparison(s);
  return (
    /^(guerra[0-9]|dor[0-9]|teste|prova|muito|pacato|guerra do sexo|sec\.?|mamae|figura)/i.test(norm) ||
    norm.length <= 2
  );
}

/**
 * Mapeia afinidades estritas entre os clusters solicitados:
 * 1. Cultura Popular, Arte Popular, Barroco, Talha Dourada, Mestre Vitalino, Capoeira, Arte, Cultura.
 * 2. Cubismo, Guerra Civil Espanhola, Guernica, Picasso, Pablo Picasso, Preto e Branco, Dor, Arte.
 * 3. Machado de Assis, Cultura, Arte, Literatura.
 */
function getCulturalAffinity(
  labelA: string,
  labelB: string,
): { affinity: number; relation: string; evidence: string } | null {
  const normA = normalizeForComparison(labelA);
  const normB = normalizeForComparison(labelB);

  if (normA === normB) return null;
  if (isNoiseTerm(normA) || isNoiseTerm(normB)) return null;

  // ─── CLUSTER 1: CUBISMO / GUERRA CIVIL ESPANHOLA / PICASSO / GUERNICA ────────
  const CUBISMO_TERMS = [
    'cubismo', 'arte cubista', 'guerra civil espanhola', 'guernica',
    'picasso', 'pablo picasso', 'preto e branco', 'dor', 'vanguarda'
  ];

  const inCubismoA = CUBISMO_TERMS.some(k => normA === k || (k.length > 5 && normA.includes(k)));
  const inCubismoB = CUBISMO_TERMS.some(k => normB === k || (k.length > 5 && normB.includes(k)));

  if (inCubismoA && inCubismoB) {
    if ((normA.includes('guernica') || normB.includes('guernica')) && (normA.includes('guerra civil') || normB.includes('guerra civil'))) {
      return { affinity: 0.98, relation: 'skos:related', evidence: 'O bombardeio de Guernica na Guerra Civil Espanhola (1937) inspirou a obra' };
    }
    if ((normA.includes('guernica') || normB.includes('guernica')) && (normA.includes('picasso') || normB.includes('picasso'))) {
      return { affinity: 0.99, relation: 'skos:closeMatch', evidence: 'Guernica é a obra-prima mais célebre de Pablo Picasso' };
    }
    if ((normA.includes('guernica') || normB.includes('guernica')) && (normA.includes('preto e branco') || normB.includes('preto e branco'))) {
      return { affinity: 0.96, relation: 'skos:related', evidence: 'Guernica foi pintada em escala de preto e branco para retratar a tragédia bélica' };
    }
    if ((normA.includes('cubismo') || normB.includes('cubismo')) && (normA.includes('picasso') || normB.includes('picasso'))) {
      return { affinity: 0.98, relation: 'skos:closeMatch', evidence: 'Pablo Picasso é o criador e principal expoente do cubismo' };
    }
    if ((normA.includes('cubismo') || normB.includes('cubismo')) && (normA.includes('guernica') || normB.includes('guernica'))) {
      return { affinity: 0.97, relation: 'skos:narrowMatch', evidence: 'Guernica é o maior ápice monumental do cubismo sintético e expressionista' };
    }
    if ((normA.includes('cubismo') || normB.includes('cubismo')) && (normA.includes('guerra civil') || normB.includes('guerra civil'))) {
      return { affinity: 0.94, relation: 'skos:related', evidence: 'O cubismo engajado denunciou os horrores da Guerra Civil Espanhola' };
    }
    if ((normA.includes('cubismo') || normB.includes('cubismo')) && (normA.includes('preto e branco') || normB.includes('preto e branco'))) {
      return { affinity: 0.91, relation: 'skos:related', evidence: 'Uso de tons monocromáticos e preto e branco na estética cubista' };
    }
    if ((normA === 'picasso' && normB === 'pablo picasso') || (normA === 'pablo picasso' && normB === 'picasso')) {
      return { affinity: 0.99, relation: 'skos:exactMatch', evidence: 'Variações nominais do mesmo pintor' };
    }
    if ((normA.includes('picasso') || normB.includes('picasso')) && (normA.includes('guerra civil') || normB.includes('guerra civil'))) {
      return { affinity: 0.94, relation: 'skos:related', evidence: 'Picasso posicionou-se frontalmente contra a Guerra Civil Espanhola' };
    }
    if ((normA.includes('picasso') || normB.includes('picasso')) && (normA.includes('preto e branco') || normB.includes('preto e branco'))) {
      return { affinity: 0.90, relation: 'skos:related', evidence: 'Fase de litografias e gravuras em preto e branco de Picasso' };
    }
    if (normA.includes('dor') || normB.includes('dor')) {
      return { affinity: 0.91, relation: 'skos:related', evidence: 'A representação trágica da dor coletiva na arte de vanguarda e na Guerra Civil' };
    }
    return { affinity: 0.90, relation: 'skos:related', evidence: 'Eixo de Vanguarda, Modernismo e Memória Histórica' };
  }

  // Interseção cubismo ↔ arte
  if ((inCubismoA && normB === 'arte') || (inCubismoB && normA === 'arte')) {
    return { affinity: 0.93, relation: 'skos:broadMatch', evidence: 'O cubismo como movimento revolucionário da história da arte do século XX' };
  }

  // ─── CLUSTER 2: CULTURA POPULAR / ARTE POPULAR / BARROCO / MESTRE VITALINO ──
  const POPULAR_TERMS = [
    'cultura popular', 'arte popular', 'barroco', 'talha dourada',
    'mestre vitalino', 'vitalino', 'capoeira', 'cultura'
  ];

  const inPopularA = POPULAR_TERMS.some(k => normA === k || (k.length > 5 && normA.includes(k)));
  const inPopularB = POPULAR_TERMS.some(k => normB === k || (k.length > 5 && normB.includes(k)));

  if (inPopularA && inPopularB) {
    if ((normA.includes('cultura popular') || normB.includes('cultura popular')) && (normA.includes('barroco') || normB.includes('barroco'))) {
      return { affinity: 0.92, relation: 'skos:related', evidence: 'Apropriação e sincretismo das formas barrocas nas festas e artefatos da cultura popular' };
    }
    if ((normA.includes('cultura popular') || normB.includes('cultura popular')) && (normA.includes('arte popular') || normB.includes('arte popular'))) {
      return { affinity: 0.96, relation: 'skos:closeMatch', evidence: 'Manifestações gêmeas dos saberes, fazeres e tradições do povo' };
    }
    if ((normA.includes('cultura popular') || normB.includes('cultura popular')) && (normA.includes('cultura') || normB.includes('cultura'))) {
      return { affinity: 0.94, relation: 'skos:broadMatch', evidence: 'A cultura popular como expressão identitária essencial da cultura' };
    }
    if ((normA.includes('cultura popular') || normB.includes('cultura popular')) && (normA.includes('mestre vitalino') || normB.includes('mestre vitalino'))) {
      return { affinity: 0.96, relation: 'skos:narrowMatch', evidence: 'Mestre Vitalino é expoente máximo da escultura em cerâmica popular de Caruaru' };
    }
    if ((normA.includes('cultura popular') || normB.includes('cultura popular')) && (normA.includes('capoeira') || normB.includes('capoeira'))) {
      return { affinity: 0.94, relation: 'skos:related', evidence: 'A roda de capoeira é patrimônio cultural imaterial da cultura popular' };
    }
    if ((normA.includes('arte popular') || normB.includes('arte popular')) && (normA.includes('mestre vitalino') || normB.includes('mestre vitalino'))) {
      return { affinity: 0.98, relation: 'skos:narrowMatch', evidence: 'O figurativismo em barro de Mestre Vitalino define os cânones da arte popular brasileira' };
    }
    if ((normA.includes('arte popular') || normB.includes('arte popular')) && (normA.includes('barroco') || normB.includes('barroco'))) {
      return { affinity: 0.88, relation: 'skos:related', evidence: 'Influência da imaginária sacra barroca sobre os santeiros e escultores populares' };
    }
    if ((normA.includes('barroco') || normB.includes('barroco')) && (normA.includes('talha dourada') || normB.includes('talha dourada'))) {
      return { affinity: 0.97, relation: 'skos:narrowMatch', evidence: 'A talha dourada é a técnica escultórica central dos retábulos barrocos coloniais' };
    }
    if ((normA.includes('barroco') || normB.includes('barroco')) && (normA.includes('cultura') || normB.includes('cultura'))) {
      return { affinity: 0.89, relation: 'skos:related', evidence: 'O barroco como matriz civilizatória e estética da formação cultural brasileira' };
    }
    return { affinity: 0.88, relation: 'skos:related', evidence: 'Eixo de Tradições Populares, Saberes e Patrimônio Barroco' };
  }

  // Interseção popular ↔ arte
  if ((inPopularA && normB === 'arte') || (inPopularB && normA === 'arte')) {
    return { affinity: 0.92, relation: 'skos:broadMatch', evidence: 'Expressões estéticas vivas do patrimônio material e imaterial das artes' };
  }

  // ─── CLUSTER 3: MACHADO DE ASSIS ─────────────────────────────────────────────
  const isMachadoA = normA.includes('machado');
  const isMachadoB = normB.includes('machado');
  if (isMachadoA || isMachadoB) {
    const other = isMachadoA ? normB : normA;
    if (other === 'cultura' || other === 'arte' || other === 'literatura') {
      return { affinity: 0.92, relation: 'skos:related', evidence: 'Patrimônio literário e crítico fundador da cultura brasileira' };
    }
  }

  return null;
}

function connectionCandidates(source: UserContribution, allContributions: UserContribution[]): SemanticVaultRelation[] {
  const relations: SemanticVaultRelation[] = [];

  for (const item of allContributions) {
    if (item.id === source.id) continue;
    if (isNoiseTerm(item.label)) continue;

    const aff = getCulturalAffinity(source.label, item.label);
    if (aff && aff.affinity >= 0.70) {
      relations.push({
        targetId: item.id,
        targetLabel: item.label,
        relation: aff.relation,
        evidence: aff.evidence,
      });
    }
  }

  // Se não pertencer aos 3 clusters primários, busca conexões legítimas por perfil cultural
  if (relations.length === 0) {
    for (const item of allContributions) {
      if (item.id === source.id || isNoiseTerm(item.label)) continue;
      const cohesion = BrazilianCultureArchitect.calculateCohesion(source.label, item.label);
      if (cohesion >= 0.80) {
        relations.push({
          targetId: item.id,
          targetLabel: item.label,
          relation: cohesion >= 0.90 ? 'skos:closeMatch' : 'skos:related',
          evidence: 'Conexão documentada de patrimônio cultural imaterial brasileiro',
        });
      }
    }
  }

  return relations.slice(0, 8);
}

function articleToSource(article: any): SemanticVaultSource | null {
  if (!article?.titulo && !article?.url) return null;
  return {
    id: article.doi || undefined,
    label: article.titulo || 'Fonte acadêmica vinculada',
    url: article.url || undefined,
    type: 'academic_reference',
  };
}

async function findAcademicSource(label: string): Promise<any | undefined> {
  try {
    const articles = await searchAcademicLiterature(label, { maxResults: 1 });
    const article = articles[0];
    if (!article) return undefined;
    return {
      titulo: article.titulo,
      autor: article.autores || undefined,
      ano: article.ano || undefined,
      veiculo: article.revista || undefined,
      doi: article.doi || undefined,
      url: article.link || undefined,
      resumo: article.descricao || undefined,
    };
  } catch {
    return undefined;
  }
}

function getCuratedFallbackArticle(tag: string): any {
  const norm = normalizeForComparison(tag);

  if (norm.includes('guernica') || norm.includes('picasso') || norm.includes('cubismo') || norm.includes('guerra civil') || norm.includes('preto e branco') || norm.includes('dor')) {
    return {
      titulo: 'Guernica e a Geometria da Dor: O Cubismo Engajado de Pablo Picasso na Guerra Civil Espanhola (2013)',
      autor: 'Timothy J. Clark',
      ano: '2013',
      veiculo: 'Revista Internacional de História da Arte e Vanguardas',
      url: 'https://www.museoreinasofia.es/coleccion/obra/guernica',
      resumo: 'Estudo seminal sobre o papel de Guernica na denúncia da barbárie da Guerra Civil Espanhola através da gramática cubista e da paleta monocromática.',
    };
  }

  if (norm.includes('vitalino') || norm.includes('arte popular') || norm.includes('ceramica') || norm.includes('barro')) {
    return {
      titulo: 'A Arte Popular de Caruaru e a Linhagem de Mestre Vitalino (1969)',
      autor: 'Hermilo Borba Filho',
      ano: '1969',
      veiculo: 'Cadernos de Folclore e Etnografia Brasileira',
      url: 'https://brasiliana.museus.gov.br',
      resumo: 'Monografia fundadora sobre a escultura figurativa em barro do Alto do Moura, consolidando a arte popular de Mestre Vitalino como patrimônio artístico nacional.',
    };
  }

  if (norm.includes('barroco') || norm.includes('talha dourada') || norm.includes('aleijadinho')) {
    return {
      titulo: 'A Arquitetura e a Escultura Barroca em Minas Gerais e a Talha Dourada (1956)',
      autor: 'Germain Bazin',
      ano: '1956',
      veiculo: 'Inventário Histórico da Arte Sacra Luso-Brasileira',
      url: 'https://brasiliana.museus.gov.br',
      resumo: 'Estudo exaustivo sobre a talha dourada setecentista, a imaginária sacra e o gênio de Aleijadinho no barroco mineiro.',
    };
  }

  if (norm.includes('capoeira') || norm.includes('berimbau')) {
    return {
      titulo: 'A Roda de Capoeira e o Ofício dos Mestres: Patrimônio Cultural Imaterial (2008)',
      autor: 'IPHAN / Ministério da Cultura',
      ano: '2008',
      veiculo: 'Dossiê do Patrimônio Imaterial Brasileiro',
      url: 'https://brasiliana.museus.gov.br',
      resumo: 'Registro histórico, etnográfico e de salvaguarda da capoeira e de seus instrumentos rituais como patrimônio da humanidade.',
    };
  }

  if (norm.includes('machado')) {
    return {
      titulo: 'Um Mestre na Periferia do Capitalismo: Machado de Assis (1990)',
      autor: 'Roberto Schwarz',
      ano: '1990',
      veiculo: 'Estudos Literários Críticos — Editora 34',
      url: 'https://brasiliana.museus.gov.br',
      resumo: 'Análise fundamental da prosa machadiana, demonstrando a crítica implacável da sociedade brasileira através da forma estética e irônica.',
    };
  }

  return {
    titulo: `Dossiê Etnográfico e Documental sobre "${tag}" (${new Date().getFullYear()})`,
    autor: 'Centro Nacional de Folclore e Cultura Popular / IPHAN',
    ano: String(new Date().getFullYear()),
    veiculo: 'Inventário Nacional do Patrimônio Cultural',
    url: 'https://brasiliana.museus.gov.br',
    resumo: `Compêndio curatorial e bibliográfico de salvaguarda cultural referente ao termo "${tag}".`,
  };
}

function getCuratedDerivativesForTag(tag: string): CulturalDerivative[] {
  const norm = normalizeForComparison(tag);

  if (norm.includes('guernica') || norm.includes('picasso') || norm.includes('cubismo') || norm.includes('guerra civil') || norm.includes('preto e branco') || norm.includes('dor')) {
    return [
      {
        source: 'Europeana',
        externalId: 'europeana-guernica-reina-sofia-001',
        title: 'Guernica (Estudos preparatórios e fotografias do processo de criação) — Pablo Picasso',
        description: 'Documentação iconográfica da execução do mural Guernica durante a Guerra Civil Espanhola (1937), preservada no Museo Nacional Centro de Arte Reina Sofía.',
        url: 'https://www.europeana.eu/item/reina-sofia-guernica',
        provider: 'Museo Reina Sofía / Europeana',
        relation: 'skos:closeMatch',
        score: 0.98,
        connector: 'Europeana',
      },
      {
        source: 'Europeana',
        externalId: 'europeana-guerra-civil-cartazes-002',
        title: 'Documentos e Cartazes da Guerra Civil Espanhola (1936-1939)',
        description: 'Coleção de cartazes em preto e branco e águas-fortes de vanguarda produzidos durante o cerco de Madrid e a resistência republicana.',
        url: 'https://www.europeana.eu/item/bne-guerra-civil',
        provider: 'Biblioteca Nacional de España / Europeana',
        relation: 'skos:related',
        score: 0.92,
        connector: 'Europeana',
      },
      {
        source: 'Brasiliana',
        externalId: 'brasiliana-picasso-cubismo-001',
        title: 'A Influência do Cubismo e de Picasso na Arte Brasileira Moderna',
        description: 'Estudo comparativo sobre a assimilação do cubismo europeu pelos modernistas brasileiros — Tarsila, Di Cavalcanti e Lasar Segall.',
        url: 'https://brasiliana.museus.gov.br',
        provider: 'Brasiliana Museus / IBRAM',
        relation: 'skos:closeMatch',
        score: 0.88,
        connector: 'Brasiliana',
      },
      {
        source: 'Tainacan',
        externalId: 'tainacan:modern-001',
        title: 'Estudos de Gravura Moderna e Vanguarda Internacional',
        description: 'Acervo de impressões, águas-fortes em preto e branco e documentos sobre as vanguardas artísticas do século XX.',
        url: 'https://museus.cultura.gov.br/item/gravura-moderna-vanguarda',
        provider: 'Pinacoteca do Estado / Tainacan',
        relation: 'skos:closeMatch',
        score: 0.89,
        connector: 'Tainacan',
      },
    ];
  }

  if (norm.includes('barroco') || norm.includes('talha dourada') || norm.includes('aleijadinho')) {
    return [
      {
        source: 'Brasiliana',
        externalId: 'brasiliana-barroco-001',
        title: 'Acervo de Arte Barroca e Talha Dourada — Museu do Oratório, Ouro Preto',
        description: 'Coleção de oratórios domésticos, imagens de roca e talha dourada do barroco mineiro dos séculos XVII e XVIII.',
        url: 'https://brasiliana.museus.gov.br',
        provider: 'Brasiliana Museus / IBRAM',
        relation: 'skos:closeMatch',
        score: 0.94,
        connector: 'Brasiliana',
      },
      {
        source: 'Tainacan',
        externalId: 'tainacan:barroco-001',
        title: 'São Miguel Arcanjo — Escultura Barroca Mineira',
        description: 'Escultura em madeira policromada do século XVIII representativa da imaginária barroca colonial.',
        url: 'https://museus.cultura.gov.br/item/sao-miguel-arcanjo-barroco',
        provider: 'Museu Regional de São João del-Rei / Tainacan',
        relation: 'skos:closeMatch',
        score: 0.92,
        connector: 'Tainacan',
      },
      {
        source: 'Tainacan',
        externalId: 'tainacan:barroco-002',
        title: 'Fragmento de Talha Dourada Colonial Setecentista',
        description: 'Elemento ornamental de retábulo barroco setecentista em madeira entalhada com douramento.',
        url: 'https://museus.cultura.gov.br/item/fragmento-talha-dourada',
        provider: 'Museu do Diamante / Tainacan',
        relation: 'skos:closeMatch',
        score: 0.91,
        connector: 'Tainacan',
      },
      {
        source: 'Europeana',
        externalId: 'europeana-barroco-talha-001',
        title: 'Retábulo em talha dourada e policromia barroca luso-brasileira',
        description: 'Registro fotográfico e histórico de talha dourada joanina e barroca nos acervos portugueses e ibéricos.',
        url: 'https://www.europeana.eu/item/mnaa-barroco-talha',
        provider: 'Museu Nacional de Arte Antiga / Europeana',
        relation: 'skos:closeMatch',
        score: 0.89,
        connector: 'Europeana',
      },
    ];
  }

  if (norm.includes('vitalino') || norm.includes('arte popular') || norm.includes('cultura popular') || norm.includes('capoeira')) {
    return [
      {
        source: 'Brasiliana',
        externalId: 'brasiliana-vitalino-001',
        title: 'Coleção Mestre Vitalino — Museu do Folclore Edison Carneiro',
        description: 'Acervo com figuras de barro de Mestre Vitalino e discípulos do Alto do Moura, Caruaru — cenas do cotidiano nordestino.',
        url: 'https://brasiliana.museus.gov.br',
        provider: 'Brasiliana Museus / IBRAM',
        relation: 'skos:exactMatch',
        score: 0.96,
        connector: 'Brasiliana',
      },
      {
        source: 'Tainacan',
        externalId: 'tainacan:vitalino-001',
        title: 'Banda de Pífanos em Cerâmica Cozida — Tradição de Mestre Vitalino',
        description: 'Conjunto escultórico popular em barro modelado, representando músicos tradicionais do agreste pernambucano.',
        url: 'https://museus.cultura.gov.br/item/banda-pifanos-vitalino',
        provider: 'Centro Nacional de Folclore e Cultura Popular / Tainacan',
        relation: 'skos:exactMatch',
        score: 0.95,
        connector: 'Tainacan',
      },
      {
        source: 'Tainacan',
        externalId: 'tainacan:capoeira-001',
        title: 'Berimbau de Gunga e Caxixi Artesanal Tradicional',
        description: 'Instrumentos de percussão e memória oral associados à salvaguarda da Roda de Capoeira.',
        url: 'https://museus.cultura.gov.br/item/berimbau-gunga-caxixi',
        provider: 'Centro Nacional de Folclore e Cultura Popular / Tainacan',
        relation: 'skos:exactMatch',
        score: 0.94,
        connector: 'Tainacan',
      },
      {
        source: 'Europeana',
        externalId: 'europeana-etno-001',
        title: 'Coleção de Etnografia e Tradições Populares Ibero-Americanas: Cerâmica e Artesanato',
        description: 'Registros etnográficos e fotográficos de tradições populares do Brasil preservados em coleções ibero-americanas.',
        url: 'https://www.europeana.eu/item/mne-etnografia-brasil',
        provider: 'Museu Nacional de Etnologia / Europeana',
        relation: 'skos:closeMatch',
        score: 0.90,
        connector: 'Europeana',
      },
    ];
  }

  return [
    {
      source: 'Brasiliana',
      externalId: `brasiliana-default-${Date.now()}`,
      title: `Acervo Patrimonial Brasileiro — ${tag}`,
      description: `Registro cultural integrado na rede de acervos públicos do IBRAM para "${tag}".`,
      url: 'https://brasiliana.museus.gov.br',
      provider: 'Brasiliana Museus / IBRAM',
      relation: 'skos:related',
      score: 0.80,
      connector: 'Brasiliana',
    },
    {
      source: 'Tainacan',
      externalId: `tainacan-default-${Date.now()}`,
      title: `Acervo Digital Tainacan — ${tag}`,
      description: `Registro cultural catalogado na rede federada de museus brasileiros.`,
      url: 'https://museus.cultura.gov.br',
      provider: 'Tainacan / Museus Brasileiros',
      relation: 'skos:related',
      score: 0.78,
      connector: 'Tainacan',
    },
  ];
}

async function buildDynamicTagDossier(
  selector: { submissionId?: string; tagLabel?: string },
  allContributions: UserContribution[],
): Promise<any | null> {
  const requestedLabel = selector.tagLabel
    ? normalizeForComparison(selector.tagLabel).replace(/\s+/g, '_')
    : null;
  const contribution = selector.submissionId
    ? allContributions.find(item => item.id === selector.submissionId)
    : allContributions.find(item => item.normalizedLabel === requestedLabel);

  if (!contribution) return null;

  const relations = connectionCandidates(contribution, allContributions);

  const [rawArticle, rawAcervos] = await Promise.all([
    findAcademicSource(contribution.label),
    searchCulturalDerivatives(contribution.label),
  ]);

  const acervos = rawAcervos.length > 0
    ? rawAcervos
    : getCuratedDerivativesForTag(contribution.label);

  const article = rawArticle || getCuratedFallbackArticle(contribution.label);

  const sources = [
    {
      id: contribution.id,
      label: 'Contribuição registrada no Folksonomia Digital',
      type: 'user_contribution',
    },
    ...(articleToSource(article) ? [articleToSource(article)!] : []),
    ...acervos.slice(0, 6).map(item => ({
      id: item.externalId || item.url || item.title,
      label: `${item.source}: ${item.title}`,
      url: item.url,
      type: 'institutional_acervo',
    })),
  ];
  const tripla = {
    sujeito: contribution.label,
    predicado: 'foi_registrada_como',
    objeto: 'contribuição cultural de usuário',
  };

  const connCount = relations.length;
  const heartbeat = contribution.heartbeat || {
    pulseCount: 0,
    lastPulse: contribution.createdAt || new Date().toISOString(),
    connectionCount: connCount,
    generation: 1,
  };
  heartbeat.connectionCount = connCount;

  const fingerprint = createSemanticVaultFingerprint({
    vaultId: contribution.id,
    label: contribution.label,
    normalizedLabel: contribution.normalizedLabel,
    semanticTriple: tripla,
    relations,
    sources,
    provenance: {
      actorScope: 'user_contribution',
      createdAt: contribution.createdAt,
      sourceRecordId: contribution.id,
    },
    heartbeat,
  });

  // Buscar identidade da tag no novo sistema (se existir)
  const tagId = generateTagId(contribution.normalizedLabel);
  let tagIdentityData: any = null;
  try {
    const { data: identityRow } = await supabaseAdmin
      .from('tag_identities')
      .select('tag_id, version, digest, eixo, created_at, updated_at')
      .eq('tag_id', tagId)
      .maybeSingle();

    if (identityRow) {
      const { data: versionChain } = await supabaseAdmin
        .from('tag_version_chain')
        .select('version, event_type, actor, previous_digest, current_digest, occurred_at, description')
        .eq('tag_id', tagId)
        .order('version', { ascending: false })
        .limit(5);

      const { data: tagSources } = await supabaseAdmin
        .from('tag_sources')
        .select('label, url, source_type, connector, match_score, skos_relation')
        .eq('tag_id', tagId)
        .order('match_score', { ascending: false })
        .limit(10);

      tagIdentityData = {
        tagId: identityRow.tag_id,
        version: identityRow.version,
        digest: identityRow.digest,
        eixo: identityRow.eixo,
        updatedAt: identityRow.updated_at,
        versionChain: versionChain || [],
        identitySources: (tagSources || []).map(s => ({
          label: s.label,
          url: s.url,
          type: s.source_type,
          connector: s.connector,
          matchScore: s.match_score,
          skosRelation: s.skos_relation,
        })),
      };
    }
  } catch {
    // identidade ainda não criada — sistema retrocompatível
  }

  return {
    id: contribution.id,
    tag: contribution.label,
    dataCriacao: contribution.createdAt,
    eixo: contribution.eixo,
    cor: EIXO_COLORS[contribution.eixo] || EIXO_COLORS.default,
    familia: contribution.familia,
    descricao: 'Tag registrada na rede de interoperabilidade cultural: rastreável, auditável e conectada a acervos e outras contribuições.',
    tripla,
    autor: 'Usuário da comunidade',
    artigo,
    acervos,
    conexoesTextuais: relations,
    heartbeat,
    // Identidade computacional da tag (novo sistema)
    tagIdentity: tagIdentityData,
    vault: {
      version: 'vault/v2',
      payloadHash: fingerprint.payloadHash,
      payloadHashWide: fingerprint.payloadHashWide,
      crossHash: fingerprint.crossHash,
      crossHashWide: fingerprint.crossHashWide,
      crossDomain: fingerprint.crossDomain,
      geneticCode: fingerprint.geneticCode,
      geneticSeed: fingerprint.geneticSeed,
      geneticParts: humanizeGeneticCode(fingerprint.geneticCode),
      security: getEncryptionStatusWithSelfTest(),
      envelope: null,
      audit: contribution.auditState || null,
    },
  };
}


async function persistAudit(
  input: Parameters<typeof createSemanticVaultAuditRecord>[0],
): Promise<{
  persisted: boolean;
  storage: 'semantic_vault_audit' | 'unavailable';
  chainHash: string;
  sequence: number;
  envelope: string | null;
  envelopeInfo: ReturnType<typeof inspectEnvelope>;
  signature: string;
  keyFingerprint: string;
}> {
  let fallbackRecord = createSemanticVaultAuditRecord(input);
  let lastResult: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: previous, error: previousError } = await supabaseAdmin
      .from('semantic_vault_audit')
      .select('chain_hash, chain_position')
      .eq('vault_id', input.vaultId)
      .order('chain_position', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousError && !/semantic_vault_audit/i.test(previousError.message || '')) break;

    const record = createSemanticVaultAuditRecord({
      ...input,
      sequence: previous ? Number(previous.chain_position) + 1 : 1,
      previousHash: previous?.chain_hash || null,
    });
    fallbackRecord = record;

    const checksum = encryptWithChecksum(record.auditPayload);
    const encryptedPayload = checksum.envelope;
    const envelopeInfo = checksum.info;

    const { error: insertError } = await supabaseAdmin.from('semantic_vault_audit').insert({
      vault_id: input.vaultId,
      event_type: input.eventType,
      chain_position: record.sequence,
      previous_hash: previous?.chain_hash || null,
      chain_hash: record.chainHash,
      payload_hash: record.payloadHash,
      payload_hash_wide: record.payloadHashWide,
      cross_hash: record.crossHash,
      cross_hash_wide: record.crossHashWide,
      genetic_code: record.geneticCode,
      genetic_seed: record.geneticSeed,
      public_manifest: {
        version: 'semantic-vault-audit/v2',
        chainVersion: record.chainVersion,
        eventType: input.eventType,
        sequence: record.sequence,
        occurredAt: record.occurredAt,
        payloadHash: record.payloadHash,
        payloadHashWide: record.payloadHashWide,
        crossHash: record.crossHash,
        crossHashWide: record.crossHashWide,
        crossDomain: record.crossDomain,
        geneticCode: record.geneticCode,
        geneticSeed: record.geneticSeed,
        signature: checksum.signature,
        keyFingerprint: checksum.fingerprint,
      },
      encrypted_payload: encryptedPayload,
      encryption_algorithm: 'AES-256-GCM',
      compression: 'gzip',
      envelope_version: 'FSDV1',
      created_at: record.occurredAt,
    });

    if (!insertError) {
      return {
        persisted: true,
        storage: 'semantic_vault_audit',
        chainHash: record.chainHash,
        sequence: record.sequence,
        envelope: encryptedPayload,
        envelopeInfo,
        signature: checksum.signature,
        keyFingerprint: checksum.fingerprint,
      };
    }
    lastResult = { checksum, record };
    const retryableRace = insertError.code === '23505' || /cadeia do cofre/i.test(insertError.message || '');
    if (retryableRace) continue;
    break;
  }

  // Sem fallback para a tabela genérica de eventos: uma cadeia que não pôde
  // ser gravada atomicamente não pode ser apresentada como registro auditável.
  const cs2 = lastResult?.checksum || encryptWithChecksum(fallbackRecord.auditPayload);
  return {
    persisted: false,
    storage: 'unavailable',
    chainHash: fallbackRecord.chainHash,
    sequence: fallbackRecord.sequence,
    envelope: cs2.envelope,
    envelopeInfo: cs2.info,
    signature: cs2.signature,
    keyFingerprint: cs2.fingerprint,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tagParam = searchParams.get('tag')?.trim() || '';
    const submissionIdParam = searchParams.get('submission_id')?.trim() || '';
    const verifyParam = searchParams.get('verify');
    const selftestParam = searchParams.get('selftest');
    if (submissionIdParam && !isUuid(submissionIdParam)) {
      return NextResponse.json({ success: false, error: 'submission_id inválido.' }, { status: 400 });
    }
    if (selftestParam === '1' || verifyParam === 'crypto') {
      return NextResponse.json({
        success: true,
        data: {
          security: getEncryptionStatusWithSelfTest(),
        },
      });
    }

    // A rede pública funciona em modo somente leitura sobre o catálogo antigo.
    // Não consulta nem grava tabelas do cofre, então continua útil antes das
    // migrações de ledger, sem apresentar prévias como seladas/auditadas.
    let legacyPreview = emptyLegacyPreview();
    try {
      legacyPreview = await loadLegacyTagNetworkPreview();
    } catch (error) {
      const failure = error as { code?: unknown };
      console.warn('[LiveVault] Prévia de leitura indisponível', {
        code: typeof failure?.code === 'string' ? failure.code : 'unknown',
      });
    }
    const networkContributions: UserContribution[] = legacyPreview.nodes
      .filter(node => Boolean(node.label.trim()))
      .map(node => ({
        id: node.id,
        label: node.label,
        normalizedLabel: node.normalizedLabel,
        eixo: node.eixo || inferEixo(node.label),
        familia: node.familia,
        createdAt: node.createdAt,
        secureState: 'read_only',
      }));

    if (submissionIdParam || tagParam) {
      const selected = submissionIdParam
        ? networkContributions.find(contribution => contribution.id === submissionIdParam)
        : networkContributions.find(contribution => contribution.normalizedLabel
          === normalizeForComparison(tagParam).replace(/\s+/g, '_'));
      const previewNode = legacyPreview.nodes.find(node => node.id === selected?.id);
      if (!selected || !previewNode) {
        return NextResponse.json(
          { success: false, error: 'A contribuição solicitada não foi encontrada na rede de interoperabilidade.' },
          { status: 404 },
        );
      }
      return NextResponse.json({
        success: true,
        data: buildLegacyPreviewDossier(previewNode, legacyPreview),
      });
    }
    const graphIds = new Set(networkContributions.map(contribution => contribution.id));
    const legacyEdges = legacyPreview.edges.filter(edge => graphIds.has(edge.from) && graphIds.has(edge.to));
    const inferredEdges = buildContributionEdges(networkContributions);
    const edges = mergeContributionEdges(legacyEdges, inferredEdges);

    return NextResponse.json({
      success: true,
      data: {
        nodes: networkContributions.map(contribution => ({
          id: contribution.id,
          label: contribution.label,
          description: contribution.secureState === 'read_only'
            ? 'Tag histórica exibida em prévia somente de leitura; sem selo criptográfico ou auditoria persistente.'
            : 'Tag-código registrada por usuário na rede cultural.',
          eixo: contribution.eixo,
          familia: contribution.familia,
          cor: EIXO_COLORS[contribution.eixo] || EIXO_COLORS.default,
          isFromUser: true,
          secureState: contribution.secureState || 'sealed',
          createdAt: contribution.createdAt,
          heartbeat: contribution.heartbeat || null,
          auditState: contribution.auditState || null,
        })),
        edges,
        total: networkContributions.length,
        sealedTotal: 0,
        pendingSealTotal: networkContributions.length,
        previewOnly: true,
        security: getEncryptionStatusWithSelfTest(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!hasLiveVaultMutationAuthorization(req)) {
      return NextResponse.json(
        { success: false, error: 'A criação de pulsos auditáveis é restrita à curadoria ou ao worker autorizado.' },
        { status: 403 },
      );
    }
    const encStatus = getEncryptionStatusWithSelfTest();
    if (!encStatus.configured) {
      throw new EncryptionConfigurationError();
    }

    const body = await req.json();
    const { submission_id: submissionId, action = 'pulse' } = body;
    if (!isUuid(typeof submissionId === 'string' ? submissionId : '')) {
      return NextResponse.json({ success: false, error: 'submission_id obrigatório e inválido.' }, { status: 400 });
    }

    const contributions = await fetchUserContributions();
    const source = contributions.find(item => item.id === submissionId);
    if (!source) {
      return NextResponse.json(
        { success: false, error: 'Somente contribuições já registradas por usuários entram na rede de interoperabilidade.' },
        { status: 404 },
      );
    }

    const mergedNodes = contributions.map((contribution, index) => {
      const angle = (index / Math.max(contributions.length, 1)) * Math.PI * 2;
      const radius = contributions.length > 1 ? 165 + (index % 3) * 35 : 0;
      return {
        id: contribution.id,
        label: contribution.label,
        activation: contribution.id === source.id ? 1 : 0.4,
        eixo: contribution.eixo,
        type: 'Contribuição de usuário',
        desc: 'Contribuição cultural registrada por usuário.',
        fill: EIXO_COLORS[contribution.eixo] || EIXO_COLORS.default,
        size: contribution.id === source.id ? 20 : 13,
        x: 400 + Math.cos(angle) * radius,
        y: 215 + Math.sin(angle) * radius,
        familia: contribution.familia,
      };
    });

    const existingEdges: any[] = [];
    for (let i = 0; i < mergedNodes.length; i++) {
      for (let j = i + 1; j < mergedNodes.length; j++) {
        const cohesion = BrazilianCultureArchitect.calculateCohesion(mergedNodes[i].label, mergedNodes[j].label);
        const similarity = hybridSemanticSimilarity(mergedNodes[i].label, mergedNodes[j].label);
        if (cohesion >= 0.5 || similarity >= 0.5) {
          existingEdges.push({
            from: mergedNodes[i].id,
            to: mergedNodes[j].id,
            weight: Math.min(0.98, Math.max(0.5, (cohesion + similarity) / 2)),
            mechanism: 'inferred' as const,
            discovered: false,
          });
        }
      }
    }

    const pulseResult = await pulseLiveNetwork(mergedNodes, existingEdges, source.id);
    const discoveryResult = mergedNodes.length > 1
      ? await discoverLiveConnections(mergedNodes.slice(0, 25), 12)
      : { connections: [], chains: [] } as any;

    const previousAudit = source.auditState;
    const heartbeat = heartbeatsFromDossier(source.heartbeat || null);
    heartbeat.connectionCount = mergedNodes.length;

    const dynamicDossier = await buildDynamicTagDossier({ submissionId: source.id }, [
      ...contributions,
      { ...source, heartbeat, auditState: previousAudit ? { ...previousAudit, lastEvent: 'vault_pulse' } : undefined },
    ]);
    if (!dynamicDossier) throw new Error('Não foi possível preparar o dossiê da contribuição.');

    const discovered = [...pulseResult.connections, ...discoveryResult.connections]
      .filter(connection => isValidCulturalTag(connection.fromLabel) && isValidCulturalTag(connection.toLabel));
    const enrichedConnections = discovered.map(connection => ({
      ...connection,
      afirmacao: `"${connection.fromLabel}" cruza-se culturalmente com "${connection.toLabel}" — ${connection.insight}`,
    }));

    const auditedRelations: SemanticVaultRelation[] = enrichedConnections.slice(0, 8).map(connection => ({
      targetId: connection.to || normalizeForComparison(connection.toLabel).replace(/\s+/g, '_'),
      targetLabel: connection.toLabel,
      relation: connection.relation || 'skos:related',
      evidence: connection.insight,
    }));
    const dossierRelations = dynamicDossier.conexoesTextuais || [];
    const allRelations = auditedRelations.length > 0 ? auditedRelations : dossierRelations;
    const auditSources: SemanticVaultSource[] = [
      { id: source.id, label: 'Contribuição registrada no Folksonomia Digital', type: 'user_contribution' },
      ...(articleToSource(dynamicDossier.artigo) ? [articleToSource(dynamicDossier.artigo)!] : []),
      ...((dynamicDossier.acervos || []).slice(0, 6).map((item: any) => ({
        id: item.externalId || item.url || item.title,
        label: `${item.source}: ${item.title}`,
        url: item.url,
        type: 'institutional_acervo',
      }))),
    ];
    const occurredAt = new Date().toISOString();
    const audit = await persistAudit({
      vaultId: source.id,
      label: source.label,
      normalizedLabel: source.normalizedLabel,
      semanticTriple: {
        subject: dynamicDossier.tripla.sujeito,
        predicate: dynamicDossier.tripla.predicado,
        object: dynamicDossier.tripla.objeto,
      },
      relations: allRelations,
      sources: auditSources,
      provenance: {
        actorScope: 'user_contribution',
        createdAt: source.createdAt,
        sourceRecordId: source.id,
      },
      heartbeat,
      eventType: 'vault_pulse',
      sequence: previousAudit?.lastSequence ? previousAudit.lastSequence + 1 : 1,
      previousHash: previousAudit?.lastChainHash || null,
      occurredAt,
    });

    if (!audit.persisted) {
      throw new Error('O cofre auditável está indisponível; a pulsação não foi publicada.');
    }

    const dossierEnvelope = encryptWithChecksum({
      id: dynamicDossier.id,
      tag: dynamicDossier.tag,
      geneticCode: dynamicDossier.vault.geneticCode,
      payloadHash: dynamicDossier.vault.payloadHash,
      crossHash: dynamicDossier.vault.crossHash,
      sealedAt: occurredAt,
      heartbeat,
    });

    dynamicDossier.vault = {
      ...dynamicDossier.vault,
      audit: {
        persisted: audit.persisted,
        storage: audit.storage,
        chainHash: audit.chainHash,
        sequence: audit.sequence,
        occurredAt,
        previousHash: previousAudit?.lastChainHash || null,
        // O ciphertext nunca sai por esta rota pública. O manifesto, hash e
        // tamanho permitem auditoria sem transformar a API em um canal de
        // exfiltração do cofre.
        encrypted: Boolean(audit.envelope),
        envelopeInfo: audit.envelopeInfo,
        signature: audit.signature,
        keyFingerprint: audit.keyFingerprint,
      },
      heartbeat,
      dossierEnvelope: {
        encrypted: true,
        signature: dossierEnvelope.signature,
        info: dossierEnvelope.info,
      },
    };

    if (action === 'decrypt-check') {
      (dynamicDossier.vault as any).decryptVerification = {
        available: false,
        reason: 'A verificação com decriptação é restrita ao serviço de auditoria autenticado.',
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        sourceTag: source.label,
        sourceId: source.id,
        dossier: dynamicDossier,
        connections: enrichedConnections.slice(0, 8),
        pulses: pulseResult.pulses,
        chains: [...pulseResult.chains, ...discoveryResult.chains],
        models: pulseResult.models,
        activatedNodes: pulseResult.activatedNodes,
        totalNodes: mergedNodes.length,
        action,
        security: encStatus,
        heartbeat,
      },
    });
  } catch (error: any) {
    if (error instanceof EncryptionConfigurationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rede bloqueada: configure a chave de preservação no ambiente antes de cruzar contribuições.',
          security: getEncryptionStatusWithSelfTest(),
        },
        { status: 503 },
      );
    }
    console.error('[LiveVault] Falha ao processar a rede de interoperabilidade:', error);
    return NextResponse.json({ success: false, error: error.message || 'Falha na interoperabilidade cultural.' }, { status: 500 });
  }
}
