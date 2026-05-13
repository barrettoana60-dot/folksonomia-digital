import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// SEGURANÇA: Chave de encriptação DEVE vir de variável de ambiente.
// Nunca usar fallback fixo em produção.
const SECRET_KEY = process.env.ENCRYPTION_KEY;
if (!SECRET_KEY) {
  console.warn('[Crypto] ENCRYPTION_KEY não definida — encriptação desabilitada. Defina no Vercel/ambiente.');
}

function getValidKey(): Buffer {
  // Ensure the key is exactly 32 bytes for aes-256
  return crypto.createHash('sha256').update(SECRET_KEY).digest();
}

/**
 * Encrypts a payload into a secure hex string with auth tag
 */
export function encryptPayload(payload: any): string {
  if (!SECRET_KEY) {
    // Sem chave, retorna JSON base64 (não encriptado) — apenas para desenvolvimento
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }
  const text = JSON.stringify(payload);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getValidKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a payload back to an object
 */
export function decryptPayload(encryptedPayload: string): any {
  try {
    if (!SECRET_KEY) {
      // Sem chave, tenta decodificar base64
      return JSON.parse(Buffer.from(encryptedPayload, 'base64').toString('utf8'));
    }
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) throw new Error('Invalid payload format');
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getValidKey(), iv);
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
