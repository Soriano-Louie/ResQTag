/**
 * Centralized email validation.
 *
 * This module is the single source of truth for what counts as a valid email
 * across ResQTag (register, login, email change, emergency contacts, tag-order
 * delivery). Being a whitelist validator it also hardens against cross-site
 * scripting: only RFC-ish email characters are allowed, so payloads containing
 * `<`, `>`, `"`, backticks, whitespace or fragments of HTML/script markup can
 * never satisfy the check and are rejected up front instead of being stored
 * and rendered elsewhere (e.g. the public emergency QR page).
 *
 * RFC 5321 limits a mailbox to 254 characters total (64 for the local part).
 */

export const EMAIL_RFC_MAX_LENGTH = 254;
export const EMAIL_LOCAL_PART_MAX_LENGTH = 64;

// Database column caps (see server/src/config/migrate.js / schema.sql).
// Enforced here so oversized input fails fast with a friendly 400 instead of
// hitting MySQL truncation/strict-mode errors.
export const USER_EMAIL_MAX_LENGTH = 100; // users.email & email_change_verifications.new_email
export const CONTACT_EMAIL_MAX_LENGTH = 100; // emergency_contacts.email
export const ORDER_EMAIL_MAX_LENGTH = 150; // tag_orders.target_email

/**
 * Strict practical email pattern:
 *  - Local part: dots and RFC-special characters but no whitespace or HTML
 *    metacharacters; at most 64 characters.
 *  - Domain: at least two dot-separated labels; each label starts/ends with an
 *    alphanumeric and may contain internal hyphens (max 63 chars per label).
 *    This also excludes underscores and any HTML/URL metacharacters in the
 *    domain, so `user@<script>...` and `user@evil.com"onerror=...` fail.
 */
export const EMAIL_REGEX =
  /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

/**
 * Returns true only when value is a non-empty string, fits within the given
 * length limit (defaulting to the RFC mailbox cap) for its local part, and
 * matches the strict email pattern exactly.
 */
export function isValidEmail(value, maxLength = EMAIL_RFC_MAX_LENGTH) {
  if (typeof value !== 'string') return false;

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return false;

  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex <= 0 || atIndex > EMAIL_LOCAL_PART_MAX_LENGTH) return false;

  return EMAIL_REGEX.test(trimmed);
}

/**
 * Normalizes an email for storage/lookups (trim + lowercase) but only when it
 * passes validation; returns null otherwise. Callers can use the returned null
 * as a signal to reject the input, and store the value with the exact casing
 * conventions used everywhere else in the app.
 */
export function sanitizeEmail(value, maxLength = EMAIL_RFC_MAX_LENGTH) {
  if (!isValidEmail(value, maxLength)) return null;
  return value.trim().toLowerCase();
}