import crypto from 'crypto';

function resolveEncryptionKey(): string {
  const envRaw = process.env.ENCRYPTION_KEY || process.env.CHAVE_DE_CRIPTURA || '';
  const env = String(envRaw || '').trim();
  // Nunca derive uma chave previsível a partir do código-fonte. Sem uma chave
  // fornecida pelo ambiente, as rotas que selam dados falham fechadas.
  return Buffer.byteLength(env, 'utf8') >= 32 ? env : '';
}

export const ML_SERVICE_URL = 
  process.env.ML_SERVICE_URL || 
  process.env.URL_DO_SERVICO_ML || 
  '';

export const ENCRYPTION_KEY = resolveEncryptionKey();
export const ENCRYPTION_KEY_VERSION = process.env.ENCRYPTION_KEY_VERSION || 'v1';

// A integração visual é opcional e só é chamada no servidor. A ausência da
// chave resulta em análise catalográfica, nunca em uma alegação visual gerada.
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
export const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash';

export const ADMIN_SECRET = 
  process.env.ADMIN_SECRET || 
  '';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isMLServiceConfigured = (): boolean => ML_SERVICE_URL.length > 0;
export const isEncryptionConfigured = (): boolean => Buffer.byteLength(ENCRYPTION_KEY, 'utf8') >= 32;
export const getEncryptionKeyFingerprint = (): string => {
  if (!isEncryptionConfigured()) return 'chave-ausente';
  const hash = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest('hex');
  return `FP::${hash.slice(0, 8)}::${hash.slice(-8)}`;
};
