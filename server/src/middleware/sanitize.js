/**
 * Input sanitization middleware:
 * Recursively cleans strings in request bodies, query params, and route params
 * - Trims excessive whitespace
 * - Strips dangerous HTML tags and script injection attempts (<script>, javascript:, onerror=, etc.)
 */

function cleanValue(val) {
  if (typeof val === 'string') {
    return val
      .trim()
      // Remove potential script tags and dangerous HTML attributes
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '') // Strip remaining HTML tags from raw user text inputs
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  }
  if (Array.isArray(val)) {
    return val.map(cleanValue);
  }
  if (val !== null && typeof val === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(val)) {
      cleaned[k] = cleanValue(v);
    }
    return cleaned;
  }
  return val;
}

export function sanitizeInputs(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = cleanValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = cleanValue(req.params);
  }
  next();
}
