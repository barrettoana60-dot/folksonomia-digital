import crypto from 'crypto';
import { ENCRYPTION_KEY } from './env';

const ALGORITHM = 'aes-256-gcm';

// SEGURANÇA: Chave de encriptação DEVE vir de variável de ambiente.
// Aceita ENCRYPTION_KEY ou CHAVE_DE_CRIPTURA (via env.ts)
const SECRET_KEY = ENCRYPTION_KEY || undefined;
if (!SECRET_KEY) {
  console.warn('[Crypto] ENCRYPTION_KEY não definida — encriptação desabilitada. Defina no Vercel/ambiente.');
}

function deriveKey(mode: 'DELTA' | 'ALFA'): Buffer {
  const seed = SECRET_KEY ? `${SECRET_KEY}:${mode}` : mode;
  return crypto.createHash('sha256').update(seed).digest();
}

/**
 * Encrypts a payload into a secure hex string with auth tag
 */
export function encryptPayload(payload: any): string {
  if (!SECRET_KEY) {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }
  const text = JSON.stringify(payload);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey('DELTA'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  return `DELTA:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function encryptPayloadDelta(payload: any): string {
  return encryptPayload(payload);
}

export function encryptPayloadAlpha(payload: any): string {
  if (!SECRET_KEY) {
    return Buffer.from(JSON.stringify({ mode: 'ALFA', payload })).toString('base64');
  }
  const text = JSON.stringify(payload);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey('ALFA'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  return `ALFA:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a payload back to an object
 */
export function decryptPayload(encryptedPayload: string): any {
  try {
    if (!SECRET_KEY) {
      return JSON.parse(Buffer.from(encryptedPayload, 'base64').toString('utf8'));
    }
    const parts = encryptedPayload.split(':');
    if (parts.length !== 4) throw new Error('Invalid payload format');

    const [mode, ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = deriveKey(mode === 'ALFA' ? 'ALFA' : 'DELTA');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('Decryption failed', err);
    return null;
  }
}

/**
 * Generates a SHA-256 cryptographic signature for data integrity
 */
export function generateSignature(data: any): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}
