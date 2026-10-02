export function requirePublicSiteUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Set PUBLIC_SITE_URL to the hosted ResQTag frontend URL before sending QR emails.'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password ||
      !host.includes('.') || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    throw new Error('PUBLIC_SITE_URL must be a public HTTPS frontend URL, not localhost or a private network address.');
  }
  return url.origin;
}
