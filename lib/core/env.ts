import crypto from 'crypto';

const CACHE_KEY_VAULT = '__encryption_key_cache__';
const DETERMINISTIC_SALT = 'folksonomia-digital:vault:deterministic-key:salt:2026';

function generateSecureKey(): string {
  const bytes = crypto.randomBytes(48);
  const hex = bytes.toString('hex');
  const b64 = Buffer.from(hex, 'hex').toString('base64url');
  return b64.slice(0, 64);
}

function deriveDeterministicKey(): string {
  const seed = [
    'Folksonomia Digital — Cofre Semântico',
    'Chave canônica de desenvolvimento — NUGEP',
    DETERMINISTIC_SALT,
    '2026-09-20 :: geração canônica',
  ].join('::');

  const derived = crypto.scryptSync(seed, DETERMINISTIC_SALT, 48, {
    N: 32_768,
    r: 8,
    p: 2,
    maxmem: 128 * 1024 * 1024,
  });

  return derived.toString('base64url').slice(0, 64);
}

function resolveEncryptionKey(): string {
  const envRaw = process.env.ENCRYPTION_KEY || process.env.CHAVE_DE_CRIPTURA || '';
  const env = String(envRaw || '').trim();
  if (env && env.length >= 32) return env;

  const g = globalThis as any;
  if (g[CACHE_KEY_VAULT] && typeof g[CACHE_KEY_VAULT] === 'string') {
    return g[CACHE_KEY_VAULT];
  }

  const fallback = process.env.NODE_ENV === 'production'
    ? deriveDeterministicKey()
    : deriveDeterministicKey();

  g[CACHE_KEY_VAULT] = fallback;
  return fallback;
}

export const ML_SERVICE_URL = 
  process.env.ML_SERVICE_URL || 
  process.env.URL_DO_SERVICO_ML || 
  '';

export const ENCRYPTION_KEY = resolveEncryptionKey();

export const ADMIN_SECRET = 
  process.env.ADMIN_SECRET || 
  '';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isMLServiceConfigured = (): boolean => ML_SERVICE_URL.length > 0;
export const isEncryptionConfigured = (): boolean => ENCRYPTION_KEY.length >= 32;
export const getEncryptionKeyFingerprint = (): string => {
  if (!ENCRYPTION_KEY) return 'chave-ausente';
  const hash = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest('hex');
  return `FP::${hash.slice(0, 8)}::${hash.slice(-8)}`;
};
