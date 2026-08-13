import * as crypto from 'crypto';

/**
 * AES-256-GCM for government ID fields at rest (Aadhaar, PAN).
 *
 * GCM rather than CBC because it's authenticated — a stored value that has
 * been truncated or tampered with fails to decrypt instead of silently
 * producing garbage that looks like a valid ID number.
 *
 * The stored format is `iv:authTag:ciphertext`, each base64. IV and auth tag
 * travel alongside the ciphertext because both are required to decrypt and
 * neither is secret on its own — this is the standard way to store a GCM
 * value in a single text column.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended for GCM

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required to read or write encrypted fields. Set it in .env.',
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes (256 bits). Generate a new one — see .env.example.');
  }
  return key;
}

export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString('base64')).join(':');
}

/** True if a stored value looks like our `iv:authTag:ciphertext` format. */
function looksEncrypted(stored: string): boolean {
  const parts = stored.split(':');
  return parts.length === 3 && parts.every((p) => /^[A-Za-z0-9+/]+=*$/.test(p));
}

/**
 * Decrypts a stored value. If the value predates encryption being switched
 * on (plain text already sitting in the column from before this feature
 * existed), it is returned as-is rather than thrown on — a production
 * migration should not hard-crash on data written before the migration
 * existed. Every write from this point forward goes through encryptField,
 * so the plaintext tail shrinks to nothing over time as records are edited.
 */
export function decryptField(stored: string): string {
  if (!looksEncrypted(stored)) return stored;

  const key = getKey();
  const [ivB64, tagB64, dataB64] = stored.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString('utf8');
}
