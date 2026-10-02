// QR destinations must stay on the hosted site even when printing from localhost.
export function getPublicSiteOrigin() {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://res-q-tag.vercel.app';
  try {
    const url = new URL(configured);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password ||
        !host.includes('.') || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
        /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return null;
    return url.origin;
  } catch { return null; }
}
