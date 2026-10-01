import crypto from 'crypto';

/**
 * How long an emailed verification code stays valid.
 *
 * Imported by both the controller (which sets expires_at) and the email service
 * (which tells the user how long they have), so the copy can never drift from
 * the actual expiry.
 */
export const VERIFICATION_CODE_TTL_MINUTES = 10;

/**
 * Maximum wrong guesses before a pending request is destroyed and the user must
 * start over. A 6-digit code has 1,000,000 possible values, so this cap — not
 * the IP rate limiter — is the real defence against brute force.
 */
export const MAX_VERIFICATION_ATTEMPTS = 5;

/**
 * Generates a cryptographically secure 6-digit verification code.
 *
 * Uses crypto.randomInt rather than Math.random() because the latter is not
 * cryptographically secure and would make the code predictable. randomInt is
 * also free of the modulo bias that naive `random % 1000000` introduces.
 *
 * The range starts at 10^(digits-1), so every code is exactly `digits` long
 * (100000-999999 at the default of 6). padStart is therefore redundant at the
 * default but preserves the length contract if the range is ever widened.
 */
export function generateVerificationCode(digits = 6) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits);
  return String(crypto.randomInt(min, max)).padStart(digits, '0');
}

/**
 * Hashes a verification code with SHA-256 for storage.
 *
 * The plaintext code is never persisted — a database leak cannot be replayed
 * against this table. SHA-256 (not bcrypt) is appropriate here because the input
 * is a low-entropy, short-lived, single-use value rather than a password: the
 * code is already rate-limited, expires, and is capped at 5 attempts, so the
 * work factor buys nothing while a slow hash would add latency per attempt.
 */
export function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks when verifying codes.
 *
 * crypto.timingSafeEqual throws if the two buffers differ in length, so the
 * lengths are compared first — that early return leaks only the length of a
 * fixed-width 6-character input, which is not sensitive.
 */
export function safeCompare(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));

  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies a submitted code against a stored hash.
 */
export function verifyVerificationCode(submittedCode, storedHash) {
  return safeCompare(hashVerificationCode(submittedCode), storedHash);
}
