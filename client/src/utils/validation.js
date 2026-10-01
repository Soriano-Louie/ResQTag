/**
 * Client-side validation helpers.
 *
 * Mirrors server/src/utils/emailValidation.js so forms give instant feedback
 * while the server remains the authoritative gate. The whitelist pattern only
 * allows email-legal characters (no `<`, `>`, `"`, backtick, whitespace, etc.),
 * which also blocks script/HTML payloads that would otherwise be stored and
 * rendered on the public emergency QR page.
 */

export const EMAIL_RFC_MAX_LENGTH = 254;
export const EMAIL_LOCAL_PART_MAX_LENGTH = 64;

// Database column caps — mirrors server/src/config/migrate.js / schema.sql so
// forms reject oversized input before it reaches the API.
export const USER_EMAIL_MAX_LENGTH = 100; // users.email & email_change_verifications.new_email
export const CONTACT_EMAIL_MAX_LENGTH = 100; // emergency_contacts.email
export const ORDER_EMAIL_MAX_LENGTH = 150; // tag_orders.target_email

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