/**
 * Folksonomia Digital 2.0 — Configuração de Variáveis de Ambiente
 * 
 * Aceita nomes em inglês E português para flexibilidade.
 */

// ML Service URL (Render)
export const ML_SERVICE_URL = 
  process.env.ML_SERVICE_URL || 
  process.env.URL_DO_SERVICO_ML || 
  '';

// Encryption Key (AES-256-GCM)
export const ENCRYPTION_KEY = 
  process.env.ENCRYPTION_KEY || 
  process.env.CHAVE_DE_CRIPTURA || 
  '';

// Admin Secret (auth guard)
export const ADMIN_SECRET = 
  process.env.ADMIN_SECRET || 
  '';

// Supabase
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Helpers
export const isMLServiceConfigured = (): boolean => ML_SERVICE_URL.length > 0;
export const isEncryptionConfigured = (): boolean => ENCRYPTION_KEY.length > 0;
