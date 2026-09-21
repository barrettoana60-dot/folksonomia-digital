import crypto from 'crypto';

const SENSITIVE_KEYS = /token|secret|password|passwd|api[_-]?key|authorization|bearer|credential|private[_-]?key|access[_-]?key|service[_-]?role|raw[_-]?data|metadata|metadados|payload|envelope|signature|keyfingerprint|_interno|security/i;

export function sha256AlphaNumeric(value: unknown): string {
  return crypto.createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
}

export function publicFingerprint(value: unknown): string {
  return `sha256${sha256AlphaNumeric(value)}`;
}

export function sanitizePublicData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => sanitizePublicData(item)) as T;
  }

  if (!value || typeof value !== 'object') return value;

  const sanitized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(key)) continue;
    sanitized[key] = sanitizePublicData(entry);
  }
  return sanitized as T;
}

export function securityHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}
