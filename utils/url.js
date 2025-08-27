// utils/url.js (opsional)
export function getBaseUrl(req) {
  const envBase = process.env.PUBLIC_URL?.replace(/\/+$/, ''); // contoh: https://api.domain.com
  if (envBase) return envBase;

  const host  = req.get('x-forwarded-host') || req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol; // akan "https" jika trust proxy diset dan header ada
  return `${proto}://${host}`;
}
