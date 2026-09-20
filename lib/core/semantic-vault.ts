import {
  canonicalize,
  canonicalStringify,
  generateAuditChainHash,
  generateCrossReferenceHash,
  generateCrossReferenceHashPair,
  generateSignature,
  generateSignature512,
} from './crypto';

export interface SemanticVaultRelation {
  targetId: string;
  targetLabel: string;
  relation: string;
  evidence?: string;
}

export interface SemanticVaultSource {
  id?: string;
  label: string;
  url?: string;
  type: string;
}

export interface SemanticVaultFingerprintInput {
  vaultId: string;
  label: string;
  normalizedLabel: string;
  semanticTriple?: {
    subject: string;
    predicate: string;
    object: string;
  };
  relations?: SemanticVaultRelation[];
  sources?: SemanticVaultSource[];
  provenance?: {
    actorScope: 'user_contribution' | 'curation' | 'system';
    createdAt?: string;
    sourceRecordId?: string;
  };
  heartbeat?: {
    pulseCount?: number;
    lastPulse?: string;
    connectionCount?: number;
    generation?: number;
  };
}

export interface SemanticVaultFingerprint {
  canonicalPayload: Record<string, unknown>;
  payloadHash: string;
  payloadHashWide: string;
  crossHash: string;
  crossHashWide: string;
  crossDomain: string;
  geneticCode: string;
  geneticSeed: string;
}

export interface SemanticVaultAuditInput extends SemanticVaultFingerprintInput {
  eventType: 'vault_pulse' | 'vault_export' | 'vault_validation' | 'vault_genesis';
  sequence: number;
  previousHash: string | null;
  occurredAt: string;
}

export interface SemanticVaultAuditRecord extends SemanticVaultFingerprint {
  auditPayload: Record<string, unknown>;
  chainHash: string;
  chainVersion: string;
  sequence: number;
  occurredAt: string;
  eventType: string;
  previousHash: string | null;
}

function sortRelations(relations: SemanticVaultRelation[] = []): SemanticVaultRelation[] {
  return [...relations]
    .map(relation => ({
      targetId: relation.targetId,
      targetLabel: relation.targetLabel,
      relation: relation.relation,
      ...(relation.evidence ? { evidence: relation.evidence } : {}),
    }))
    .sort((a, b) => `${a.targetId}:${a.relation}`.localeCompare(`${b.targetId}:${b.relation}`));
}

function sortSources(sources: SemanticVaultSource[] = []): SemanticVaultSource[] {
  return [...sources]
    .map(source => ({
      ...(source.id ? { id: source.id } : {}),
      label: source.label,
      ...(source.url ? { url: source.url } : {}),
      type: source.type,
    }))
    .sort((a, b) => `${a.type}:${a.id || a.url || a.label}`.localeCompare(`${b.type}:${b.id || b.url || b.label}`));
}

const GENETIC_ALPHABET = ['F', 'S', 'D', 'N', 'A', '1', 'C', 'V', '4', 'E', 'B', 'R', 'X', '7', 'M', 'K'];

function encodeGeneticSegment(hexSegment: string): string {
  let result = '';
  for (let i = 0; i < hexSegment.length; i += 2) {
    const byte = parseInt(hexSegment.slice(i, i + 2) || '0', 16);
    result += GENETIC_ALPHABET[byte % GENETIC_ALPHABET.length];
  }
  return result;
}

export function createSemanticVaultFingerprint(input: SemanticVaultFingerprintInput): SemanticVaultFingerprint {
  const canonicalPayload = canonicalize({
    version: 'semantic-vault/v2',
    vaultId: input.vaultId,
    contribution: {
      label: input.label,
      normalizedLabel: input.normalizedLabel,
      ...(input.semanticTriple ? { semanticTriple: input.semanticTriple } : {}),
    },
    relations: sortRelations(input.relations),
    sources: sortSources(input.sources),
    provenance: {
      actorScope: input.provenance?.actorScope || 'user_contribution',
      ...(input.provenance?.createdAt ? { createdAt: input.provenance.createdAt } : {}),
      ...(input.provenance?.sourceRecordId ? { sourceRecordId: input.provenance.sourceRecordId } : {}),
    },
    heartbeat: {
      pulseCount: input.heartbeat?.pulseCount ?? 0,
      lastPulse: input.heartbeat?.lastPulse ?? null,
      connectionCount: input.heartbeat?.connectionCount ?? 0,
      generation: input.heartbeat?.generation ?? 1,
    },
  }) as Record<string, unknown>;

  const payloadHash = generateSignature(canonicalPayload);
  const payloadHashWide = generateSignature512(canonicalPayload);
  const crossPair = generateCrossReferenceHashPair({
    vaultId: input.vaultId,
    contribution: (canonicalPayload.contribution as Record<string, unknown>) || {},
    relations: canonicalPayload.relations,
    sources: canonicalPayload.sources,
    heartbeat: canonicalPayload.heartbeat,
  });

  const labelSeed = generateSignature({ vaultId: input.vaultId, label: input.normalizedLabel });
  const geneA = encodeGeneticSegment(payloadHash.slice(0, 16));
  const geneB = encodeGeneticSegment(crossPair.crossHash.slice(0, 16));
  const geneC = encodeGeneticSegment(labelSeed.slice(0, 12));
  const geneD = encodeGeneticSegment(payloadHashWide.slice(0, 8));
  const geneticSeed = [geneA, geneB, geneC, geneD].join('');

  const generation = String(input.heartbeat?.generation ?? 1).padStart(3, '0');
  const connCount = String(Math.min(999, (input.heartbeat?.connectionCount ?? (input.relations?.length || 0)))).padStart(3, '0');
  const geneticCode = [
    'FSDNA2',
    payloadHash.slice(0, 8).toUpperCase(),
    crossPair.crossHash.slice(0, 8).toUpperCase(),
    `${geneA.slice(0, 4)}${geneB.slice(0, 4)}${geneC.slice(0, 4)}`,
    `G${generation}C${connCount}`,
  ].join('-');

  return {
    canonicalPayload,
    payloadHash,
    payloadHashWide,
    crossHash: crossPair.crossHash,
    crossHashWide: crossPair.crossHashWide,
    crossDomain: crossPair.crossDomain,
    geneticCode,
    geneticSeed,
  };
}

export function verifySemanticVaultFingerprint(
  input: SemanticVaultFingerprintInput,
  expected: { payloadHash: string; crossHash: string; geneticCode: string },
): {
  valid: boolean;
  payloadMatches: boolean;
  crossMatches: boolean;
  geneticMatches: boolean;
  recovered: SemanticVaultFingerprint | null;
} {
  try {
    const recovered = createSemanticVaultFingerprint(input);
    return {
      valid:
        recovered.payloadHash === expected.payloadHash &&
        recovered.crossHash === expected.crossHash &&
        recovered.geneticCode === expected.geneticCode,
      payloadMatches: recovered.payloadHash === expected.payloadHash,
      crossMatches: recovered.crossHash === expected.crossHash,
      geneticMatches: recovered.geneticCode === expected.geneticCode,
      recovered,
    };
  } catch {
    return { valid: false, payloadMatches: false, crossMatches: false, geneticMatches: false, recovered: null };
  }
}

export function createSemanticVaultAuditRecord(input: SemanticVaultAuditInput): SemanticVaultAuditRecord {
  const fingerprint = createSemanticVaultFingerprint(input);
  const chainHash = generateAuditChainHash({
    vaultId: input.vaultId,
    sequence: input.sequence,
    eventType: input.eventType,
    payloadHash: fingerprint.payloadHash,
    crossHash: fingerprint.crossHash,
    previousHash: input.previousHash,
    occurredAt: input.occurredAt,
    geneticCode: fingerprint.geneticCode,
  });

  const auditPayload = canonicalize({
    version: 'semantic-vault-audit/v2',
    chainVersion: 'FSC-1',
    eventType: input.eventType,
    sequence: input.sequence,
    occurredAt: input.occurredAt,
    previousHash: input.previousHash,
    chainHash,
    payloadHash: fingerprint.payloadHash,
    payloadHashWide: fingerprint.payloadHashWide,
    crossHash: fingerprint.crossHash,
    crossHashWide: fingerprint.crossHashWide,
    crossDomain: fingerprint.crossDomain,
    geneticCode: fingerprint.geneticCode,
    geneticSeed: fingerprint.geneticSeed,
    record: fingerprint.canonicalPayload,
  }) as Record<string, unknown>;

  return {
    ...fingerprint,
    auditPayload,
    chainHash,
    chainVersion: 'FSC-1',
    sequence: input.sequence,
    occurredAt: input.occurredAt,
    eventType: input.eventType,
    previousHash: input.previousHash,
  };
}

export function heartbeatsFromDossier(
  dossier: { pulseCount?: number; lastPulse?: string; connectionCount?: number; generation?: number } | null,
): {
  pulseCount: number;
  lastPulse: string;
  connectionCount: number;
  generation: number;
} {
  return {
    pulseCount: (dossier?.pulseCount ?? 0) + 1,
    lastPulse: new Date().toISOString(),
    connectionCount: dossier?.connectionCount ?? 0,
    generation: (dossier?.generation ?? 0) + 1,
  };
}

export function humanizeGeneticCode(geneticCode: string): {
  prefix: string;
  identity: string;
  crossover: string;
  dna: string;
  marker: string;
} {
  const parts = geneticCode.split('-');
  return {
    prefix: parts[0] || 'FSDNA2',
    identity: parts[1] || '',
    crossover: parts[2] || '',
    dna: parts[3] || '',
    marker: parts[4] || '',
  };
}
