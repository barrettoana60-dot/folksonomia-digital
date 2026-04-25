import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// In a real app, use a strong env secret. Here we fallback for demo purposes.
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'folksonomia_digital_secure_key_32_bytes_len!!';

function getValidKey(): Buffer {
  // Ensure the key is exactly 32 bytes for aes-256
  return crypto.createHash('sha256').update(SECRET_KEY).digest();
}

/**
 * Encrypts a payload into a secure hex string with auth tag
 */
export function encryptPayload(payload: any): string {
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
