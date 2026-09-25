import crypto from 'crypto';

/**
 * Generates a cryptographically secure, unguessable random token for QR codes.
 * Default 16 bytes = 32 hexadecimal characters.
 * Example output: 'a8f42c91d7e34b62f0194a2b91c834de'
 */
export function generateSecureQRToken(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}
