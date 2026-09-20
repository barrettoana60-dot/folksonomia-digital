import crypto from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';
import { ENCRYPTION_KEY, getEncryptionKeyFingerprint } from './env';

const ALGORITHM = 'aes-256-gcm';
const ENVELOPE_VERSION = 'FSDV1';
const COMPRESSION = 'gzip';
const MAX_DECOMPRESSED_BYTES = 2 * 1024 * 1024;
const keyCache = new Map<string, Buffer>();

export type EncryptionMode = 'DELTA' | 'ALFA';

export interface EncryptionStatus {
  configured: boolean;
  algorithm: 'AES-256-GCM';
  envelopeVersion: typeof ENVELOPE_VERSION;
  compression: typeof COMPRESSION;
  keyFingerprint: string;
  keyBitLength: number;
  selfTest?: {
    encryptDecryptRoundtrip: 'pass' | 'fail';
    hashDeterminism: 'pass' | 'fail';
    compressionRatio: string;
  };
}

export class EncryptionConfigurationError extends Error {
  readonly code = 'ENCRYPTION_KEY_MISSING';
  constructor() {
    super('ENCRYPTION_KEY não configurada. O Cofre Semântico não pode gravar dados sem uma chave AES-256.');
    this.name = 'EncryptionConfigurationError';
  }
}

export function getEncryptionStatus(): EncryptionStatus {
  const keyLen = ENCRYPTION_KEY ? Buffer.byteLength(ENCRYPTION_KEY, 'utf8') * 8 : 0;
  return {
    configured: Boolean(ENCRYPTION_KEY) && keyLen >= 256,
    algorithm: 'AES-256-GCM',
    envelopeVersion: ENVELOPE_VERSION,
    compression: COMPRESSION,
    keyFingerprint: getEncryptionKeyFingerprint(),
    keyBitLength: Math.max(256, keyLen),
  };
}

export function getEncryptionStatusWithSelfTest(): EncryptionStatus {
  const base = getEncryptionStatus();
  try {
    const probe = { ts: Date.now(), probe: 'self-test', v: 1, nested: { a: [1, 2, 3], b: 'canônico' } };
    const encrypted = encryptPayload(probe);
    const decrypted = decryptPayload(encrypted) as any;
    const roundtrip = Boolean(decrypted && decrypted.probe === 'self-test' && decrypted.v === 1);
    const h1 = generateSignature(probe);
    const h2 = generateSignature(probe);
    const deterministic = h1 === h2 && h1.length === 64;
    const raw = JSON.stringify(probe).length;
    const comp = encrypted.length;
    const ratio = raw > 0 ? `${Math.round((1 - comp / raw) * 100)}% (raw=${raw}, env=${comp})` : 'n/d';
    return {
      ...base,
      selfTest: {
        encryptDecryptRoundtrip: roundtrip ? 'pass' : 'fail',
        hashDeterminism: deterministic ? 'pass' : 'fail',
        compressionRatio: ratio,
      },
    };
  } catch {
    return {
      ...base,
      selfTest: {
        encryptDecryptRoundtrip: 'fail',
        hashDeterminism: 'fail',
        compressionRatio: 'erro no self-test',
      },
    };
  }
}

export function assertEncryptionConfigured(): void {
  const status = getEncryptionStatus();
  if (!status.configured) throw new EncryptionConfigurationError();
}

export function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(item => canonicalize(item));
  const record = value as Record<string, unknown>;
  return Object.keys(record)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      const item = record[key];
      if (item !== undefined) result[key] = canonicalize(item);
      return result;
    }, {});
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value)) ?? 'null';
}

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha512half(value: string | Buffer): string {
  const full = crypto.createHash('sha512').update(value).digest('hex');
  return full.slice(0, 64);
}

export function generateSignature(data: unknown): string {
  return sha256(canonicalStringify(data));
}

export function generateSignature512(data: unknown): string {
  return sha512half(canonicalStringify(data));
}

export function generateCrossReferenceHash(data: unknown): string {
  const canonical = canonicalize({
    domain: 'folksonomia-digital/semantic-cross-reference/v1',
    data,
    nonce: 'cofre-vivo::2026',
  });
  return sha256(canonicalStringify(canonical));
}

export function generateCrossReferenceHashPair(data: unknown): {
  crossHash: string;
  crossHashWide: string;
  crossDomain: string;
} {
  const canonical = canonicalize({
    domain: 'folksonomia-digital/semantic-cross-reference/v1',
    data,
    nonce: 'cofre-vivo::2026',
  }) as Record<string, unknown>;
  const serialized = canonicalStringify(canonical);
  return {
    crossHash: sha256(serialized),
    crossHashWide: sha512half(serialized),
    crossDomain: 'folksonomia-digital/semantic-cross-reference/v1',
  };
}

export function generateAuditChainHash(data: {
  vaultId: string;
  sequence: number;
  eventType: string;
  payloadHash: string;
  crossHash: string;
  previousHash: string | null;
  occurredAt: string;
  geneticCode?: string;
}): string {
  return sha256(canonicalStringify({
    domain: 'folksonomia-digital/semantic-audit-chain/v1',
    chainVersion: 'FSC-1',
    ...data,
  }));
}

function deriveKey(mode: EncryptionMode): Buffer {
  assertEncryptionConfigured();
  const cached = keyCache.get(mode);
  if (cached) return cached;
  const key = crypto.scryptSync(
    ENCRYPTION_KEY,
    `folksonomia-digital:semantic-vault:v1:${mode}`,
    32,
    { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
  );
  keyCache.set(mode, key);
  return key;
}

function deriveLegacyKey(mode: EncryptionMode): Buffer {
  assertEncryptionConfigured();
  return crypto.createHash('sha256').update(`${ENCRYPTION_KEY}:${mode}`).digest();
}

function toBase64Url(value: Buffer): string {
  return value.toString('base64url');
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

export interface EnvelopeInfo {
  version: typeof ENVELOPE_VERSION;
  mode: EncryptionMode;
  compression: typeof COMPRESSION;
  ivSize: number;
  authTagSize: number;
  ciphertextSize: number;
  envelopeSize: number;
}

export function inspectEnvelope(encrypted: string): EnvelopeInfo | null {
  try {
    if (!encrypted.startsWith(`${ENVELOPE_VERSION}.`)) return null;
    const parts = encrypted.split('.');
    if (parts.length !== 6) return null;
    const [, mode, compression, iv64, auth64, ct64] = parts;
    return {
      version: ENVELOPE_VERSION,
      mode: mode as EncryptionMode,
      compression: compression as typeof COMPRESSION,
      ivSize: Buffer.from(iv64, 'base64url').length,
      authTagSize: Buffer.from(auth64, 'base64url').length,
      ciphertextSize: Buffer.from(ct64, 'base64url').length,
      envelopeSize: encrypted.length,
    };
  } catch {
    return null;
  }
}

function encryptWithMode(payload: unknown, mode: EncryptionMode): string {
  const plaintext = Buffer.from(canonicalStringify(payload), 'utf8');
  const compressed = gzipSync(plaintext, { level: 9 });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(mode), iv);
  cipher.setAAD(Buffer.from(`${ENVELOPE_VERSION}:${mode}:${COMPRESSION}`, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENVELOPE_VERSION,
    mode,
    COMPRESSION,
    toBase64Url(iv),
    toBase64Url(authTag),
    toBase64Url(ciphertext),
  ].join('.');
}

export function encryptPayload(payload: unknown): string {
  return encryptWithMode(payload, 'DELTA');
}

export function encryptPayloadDelta(payload: unknown): string {
  return encryptWithMode(payload, 'DELTA');
}

export function encryptPayloadAlpha(payload: unknown): string {
  return encryptWithMode(payload, 'ALFA');
}

export function encryptWithChecksum(payload: unknown): {
  envelope: string;
  signature: string;
  fingerprint: string;
  info: EnvelopeInfo;
} {
  const envelope = encryptPayload(payload);
  const signature = generateSignature(payload);
  const fingerprint = getEncryptionKeyFingerprint();
  const info = inspectEnvelope(envelope)!;
  return { envelope, signature, fingerprint, info };
}

function decryptV1(parts: string[]): unknown {
  if (parts.length !== 6) throw new Error('Envelope criptográfico inválido');
  const [, modeValue, compression, ivValue, authTagValue, ciphertextValue] = parts;
  if ((modeValue !== 'DELTA' && modeValue !== 'ALFA') || compression !== COMPRESSION) {
    throw new Error('Algoritmo ou modo de envelope não suportado');
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    deriveKey(modeValue),
    fromBase64Url(ivValue),
  );
  decipher.setAAD(Buffer.from(`${ENVELOPE_VERSION}:${modeValue}:${COMPRESSION}`, 'utf8'));
  decipher.setAuthTag(fromBase64Url(authTagValue));
  const compressed = Buffer.concat([
    decipher.update(fromBase64Url(ciphertextValue)),
    decipher.final(),
  ]);
  const plaintext = gunzipSync(compressed, { maxOutputLength: MAX_DECOMPRESSED_BYTES });
  return JSON.parse(plaintext.toString('utf8'));
}

function decryptLegacy(parts: string[]): unknown {
  if (parts.length !== 4) throw new Error('Envelope legado inválido');
  const [modeValue, ivHex, authTagHex, ciphertextHex] = parts;
  const mode: EncryptionMode = modeValue === 'ALFA' ? 'ALFA' : 'DELTA';
  const decipher = crypto.createDecipheriv(ALGORITHM, deriveLegacyKey(mode), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString('utf8'));
}

export function decryptPayload(encryptedPayload: string): unknown | null {
  try {
    assertEncryptionConfigured();
    if (encryptedPayload.startsWith(`${ENVELOPE_VERSION}.`)) {
      return decryptV1(encryptedPayload.split('.'));
    }
    if (encryptedPayload.startsWith('DELTA:') || encryptedPayload.startsWith('ALFA:')) {
      return decryptLegacy(encryptedPayload.split(':'));
    }
    throw new Error('Formato de payload não reconhecido');
  } catch (error) {
    console.error('[Crypto] Falha ao verificar ou descriptografar envelope:', error instanceof Error ? error.message : 'erro desconhecido');
    return null;
  }
}

export function decryptAndVerify(encryptedPayload: string, expectedSignature?: string): {
  valid: boolean;
  payload: unknown | null;
  recoveredSignature: string | null;
  mismatch: boolean;
} {
  const payload = decryptPayload(encryptedPayload);
  if (payload === null) {
    return { valid: false, payload: null, recoveredSignature: null, mismatch: true };
  }
  const recoveredSignature = generateSignature(payload);
  const valid = !expectedSignature || recoveredSignature === expectedSignature;
  return {
    valid,
    payload,
    recoveredSignature,
    mismatch: Boolean(expectedSignature && recoveredSignature !== expectedSignature),
  };
}
