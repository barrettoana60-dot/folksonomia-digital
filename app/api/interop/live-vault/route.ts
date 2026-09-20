import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { discoverLiveConnections, pulseLiveNetwork } from '@/lib/ml/live-network-engine';
import { hybridSemanticSimilarity } from '@/lib/ml/similarity';
import { BrazilianCultureArchitect } from '@/lib/ml/cultural-architect';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { searchAcademicLiterature } from '@/lib/ml/academic-search';
import {
  encryptPayload,
  encryptWithChecksum,
  decryptAndVerify,
  inspectEnvelope,
  EncryptionConfigurationError,
  getEncryptionStatusWithSelfTest,
  getEncryptionStatus,
} from '@/lib/core/crypto';
import {
  createSemanticVaultAuditRecord,
  createSemanticVaultFingerprint,
  verifySemanticVaultFingerprint,
  heartbeatsFromDossier,
  humanizeGeneticCode,
  SemanticVaultRelation,
  SemanticVaultSource,
} from '@/lib/core/semantic-vault';
import { searchCulturalDerivatives, discoverCulturalRelations } from '@/lib/connectors/cultural-interop';
import { generateTagId, toDisplayFormat } from '@/lib/core/tag-identity';

export const dynamic = 'force-dynamic';

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
}

function isValidCulturalTag(label?: string): boolean {
  if (!label || typeof label !== 'string') return false;
  const clean = label.trim().toLowerCase();
  if (clean.length < 3 || clean.length > 160 || /^[0-9]+$/.test(clean)) return false;
  const noise = /(test|teste|asdf|foo|bar|baz|null|undefined|teste_|teste[0-9])/i;
  return !noise.test(clean);
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

async function fetchLastAuditFor(vaultId: string): Promise<{
  lastSequence: number;
  lastChainHash: string | null;
  lastEvent: string | null;
  pulseCount: number;
  lastPulse: string;
  connectionCount: number;
  generation: number;
} | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('semantic_vault_audit')
      .select('chain_position, chain_hash, event_type, created_at, public_manifest, genetic_code')
      .eq('vault_id', vaultId)
      .order('chain_position', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && !/semantic_vault_audit/i.test(error.message || '')) return null;
    if (!data) {
      const { data: evtData } = await supabaseAdmin
        .from('eventos')
        .select('chain_position:id, hash_evento, tipo_evento, created_at, payload')
        .eq('entidade_tipo', 'semantic_vault')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!evtData) return null;
      return {
        lastSequence: Number((evtData.payload as any)?.sequence || 0),
        lastChainHash: evtData.hash_evento || null,
        lastEvent: evtData.tipo_evento || null,
        pulseCount: Number((evtData.payload as any)?.sequence || 0),
        lastPulse: evtData.created_at || new Date().toISOString(),
        connectionCount: 0,
        generation: Number((evtData.payload as any)?.sequence || 1),
      };
    }

    const manifest = (data.public_manifest as any) || {};
    const genetic = data.genetic_code || '';
    const markerMatch = genetic.match(/G(\d{3})C(\d{3})/);
    const generation = markerMatch ? Number(markerMatch[1]) : 1;
    const connectionCount = markerMatch ? Number(markerMatch[2]) : 0;

    return {
      lastSequence: Number(data.chain_position || 0),
      lastChainHash: data.chain_hash || null,
      lastEvent: data.event_type || null,
      pulseCount: Number(data.chain_position || 0),
      lastPulse: data.created_at || new Date().toISOString(),
      connectionCount,
      generation,
    };
  } catch {
    return null;
  }
}

async function fetchUserContributions(): Promise<UserContribution[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, tag_normalizada, grupo_tematico, criado_em')
      .order('criado_em', { ascending: false })
      .limit(300);

    if (error) throw error;

    const seen = new Set<string>();
    const contributions: UserContribution[] = [];
    for (const tag of data || []) {
      const label = String(tag.tag_original || tag.tag_normalizada || '').trim();
      const normalizedLabel = normalizeForComparison(label).replace(/\s+/g, '_');
      if (!isValidCulturalTag(label) || !normalizedLabel || seen.has(normalizedLabel)) continue;

      seen.add(normalizedLabel);
      const eixo = tag.grupo_tematico || inferEixo(label);
      const auditState = await fetchLastAuditFor(normalizedLabel);
      contributions.push({
        id: normalizedLabel,
        label,
        normalizedLabel,
        eixo,
        familia: `${String(eixo).toLowerCase()}.${normalizedLabel}`,
        createdAt: tag.criado_em || undefined,
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
    return contributions;
  } catch (error) {
    console.warn('[LiveVault] Não foi possível carregar contribuições de usuários:', error instanceof Error ? error.message : error);
    return [];
  }
}

async function fetchHumanAuditPending(): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('nucleos')
      .select('id', { count: 'exact', head: true })
      .in('status_validacao', ['bruto', 'em_analise']);
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

function buildContributionEdges(contributions: UserContribution[]) {
  const sample = contributions.slice(0, 80);
  const edges: Array<{ from: string; to: string; weight: number; skosRelation: string; discovered: boolean }> = [];
  for (let i = 0; i < sample.length; i++) {
    for (let j = i + 1; j < sample.length; j++) {
      const cohesion = BrazilianCultureArchitect.calculateCohesion(sample[i].label, sample[j].label);
      const similarity = hybridSemanticSimilarity(sample[i].label, sample[j].label);
      const weight = Math.min(0.98, Math.max(0, (cohesion + similarity) / 2));
      if (cohesion >= 0.42 || similarity >= 0.42) {
        edges.push({
          from: sample[i].id,
          to: sample[j].id,
          weight,
          skosRelation: cohesion >= 0.7 ? 'skos:closeMatch' : 'skos:related',
          discovered: false,
        });
      }
    }
  }
  return edges.slice(0, 160);
}

function connectionCandidates(source: UserContribution, allContributions: UserContribution[]): SemanticVaultRelation[] {
  return allContributions
    .filter(item => item.id !== source.id)
    .map(item => {
      const semanticScore = hybridSemanticSimilarity(source.label, item.label);
      const axisBonus = source.eixo === item.eixo ? 0.15 : 0;
      const score = semanticScore + axisBonus;
      return { item, score };
    })
    .filter(({ score }) => score >= 0.35)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
    .slice(0, 6)
    .map(({ item }) => ({
      targetId: item.id,
      targetLabel: item.label,
      relation: 'skos:related',
      evidence: 'correlação semântica entre contribuições de usuários',
    }));
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

async function buildDynamicTagDossier(
  tagLabel: string,
  allContributions: UserContribution[],
): Promise<any | null> {
  const normalizedLabel = normalizeForComparison(tagLabel).replace(/\s+/g, '_');
  const contribution = allContributions.find(item => item.id === normalizedLabel);
  if (!contribution) return null;

  const relations = connectionCandidates(contribution, allContributions);
  const [article, acervos] = await Promise.all([
    findAcademicSource(contribution.label),
    searchCulturalDerivatives(contribution.label),
  ]);
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
  storage: 'semantic_vault_audit' | 'eventos' | 'unavailable';
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
    if (insertError.code === '23505') continue;
    break;
  }

  try {
    const cs = lastResult?.checksum || encryptWithChecksum(fallbackRecord.auditPayload);
    const encryptedPayload = cs.envelope;
    const { error } = await supabaseAdmin.from('eventos').insert({
      entidade_tipo: 'semantic_vault',
      entidade_id: null,
      tipo_evento: input.eventType,
      resumo: `Cofre semântico: ${input.eventType} para ${input.vaultId}`,
      payload: {
        vaultId: input.vaultId,
        sequence: fallbackRecord.sequence,
        crossHash: fallbackRecord.crossHash,
        geneticCode: fallbackRecord.geneticCode,
        encryptedPayload,
        encryption: getEncryptionStatus(),
        signature: cs.signature,
      },
      hash_evento: fallbackRecord.chainHash,
      hash_anterior: (fallbackRecord.previousHash as any) || null,
    });
    if (!error) {
      return {
        persisted: true,
        storage: 'eventos',
        chainHash: fallbackRecord.chainHash,
        sequence: fallbackRecord.sequence,
        envelope: encryptedPayload,
        envelopeInfo: cs.info,
        signature: cs.signature,
        keyFingerprint: cs.fingerprint,
      };
    }
  } catch {
    // sem persistência
  }

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
    const tagParam = searchParams.get('tag');
    const verifyParam = searchParams.get('verify');
    const selftestParam = searchParams.get('selftest');
    const [contributions, pendingHumanAudit] = await Promise.all([
      fetchUserContributions(),
      fetchHumanAuditPending(),
    ]);

    if (selftestParam === '1' || verifyParam === 'crypto') {
      return NextResponse.json({
        success: true,
        data: {
          security: getEncryptionStatusWithSelfTest(),
        },
      });
    }

    if (tagParam) {
      const dossier = await buildDynamicTagDossier(tagParam, contributions);
      if (!dossier) {
        return NextResponse.json(
          { success: false, error: 'A contribuição solicitada não foi encontrada na rede de interoperabilidade.' },
          { status: 404 },
        );
      }

      const verify = searchParams.get('verify') === 'integrity';
      if (verify) {
        const norm = normalizeForComparison(tagParam).replace(/\s+/g, '_');
        const contrib = contributions.find(c => c.id === norm);
        if (contrib && dossier.vault) {
          const relations = dossier.conexoesTextuais || [];
          const sources = [
            { id: contrib.id, label: 'Contribuição registrada no Folksonomia Digital', type: 'user_contribution' },
            ...(articleToSource(dossier.artigo) ? [articleToSource(dossier.artigo)!] : []),
          ];
          const result = verifySemanticVaultFingerprint(
            {
              vaultId: contrib.id,
              label: contrib.label,
              normalizedLabel: contrib.normalizedLabel,
              semanticTriple: dossier.tripla,
              relations,
              sources,
              provenance: {
                actorScope: 'user_contribution',
                createdAt: contrib.createdAt,
                sourceRecordId: contrib.id,
              },
              heartbeat: dossier.heartbeat,
            },
            {
              payloadHash: dossier.vault.payloadHash,
              crossHash: dossier.vault.crossHash,
              geneticCode: dossier.vault.geneticCode,
            },
          );
          dossier.verification = {
            requestedAt: new Date().toISOString(),
            ...result,
            recovered: null,
          };
        }
      }

      return NextResponse.json({ success: true, data: dossier });
    }

    const edges = buildContributionEdges(contributions);

    return NextResponse.json({
      success: true,
      data: {
        nodes: contributions.map(contribution => ({
          id: contribution.id,
          label: contribution.label,
          description: 'Tag-código registrada por usuário na rede cultural.',
          eixo: contribution.eixo,
          familia: contribution.familia,
          cor: EIXO_COLORS[contribution.eixo] || EIXO_COLORS.default,
          isFromUser: true,
          createdAt: contribution.createdAt,
          heartbeat: contribution.heartbeat || null,
          auditState: contribution.auditState || null,
        })),
        edges,
        total: contributions.length,
        humanAudit: {
          required: true,
          pending: pendingHumanAudit,
          path: '/admin/validacao',
        },
        security: getEncryptionStatusWithSelfTest(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const encStatus = getEncryptionStatusWithSelfTest();
    if (!encStatus.configured) {
      throw new EncryptionConfigurationError();
    }

    const body = await req.json();
    const { sourceTag, action = 'pulse' } = body;
    if (!isValidCulturalTag(sourceTag)) {
      return NextResponse.json({ success: false, error: 'Contribuição inválida.' }, { status: 400 });
    }

    const contributions = await fetchUserContributions();
    const targetId = normalizeForComparison(sourceTag).replace(/\s+/g, '_');
    const source = contributions.find(item => item.id === targetId);
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

    const dynamicDossier = await buildDynamicTagDossier(source.label, [
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
        envelope: audit.envelope,
        envelopeInfo: audit.envelopeInfo,
        signature: audit.signature,
        keyFingerprint: audit.keyFingerprint,
      },
      heartbeat,
      dossierEnvelope: {
        envelope: dossierEnvelope.envelope,
        signature: dossierEnvelope.signature,
        info: dossierEnvelope.info,
      },
    };

    if (audit.envelope && action === 'decrypt-check') {
      const verification = decryptAndVerify(audit.envelope, audit.signature);
      (dynamicDossier.vault as any).decryptVerification = verification;
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
