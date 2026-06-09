// Client-side tenant resolution for the white-label web app.
// The Next.js middleware (src/middleware.js) sets an `x-tenant` cookie based on
// the request host/subdomain; here we read it (falling back to the hostname or
// the configured default) so every API call can carry an `X-Tenant` header.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
export const PLATFORM_API_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? 'http://localhost:8000';
export const DEFAULT_TENANT = process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? 'dollara';

const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

export function slugFromHost(host) {
  if (!host) return null;
  const clean = host.split(':')[0].toLowerCase();
  if (LOCAL_HOSTS.has(clean)) return null;
  const labels = clean.split('.');
  if (labels.length >= 2 && !RESERVED_SUBDOMAINS.has(labels[0])) {
    return labels[0];
  }
  return null;
}

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getTenantSlug() {
  if (typeof window !== 'undefined') {
    const cookieSlug = readCookie('x-tenant');
    if (cookieSlug) return cookieSlug;
    const hostSlug = slugFromHost(window.location.hostname);
    if (hostSlug) return hostSlug;
  }
  return DEFAULT_TENANT;
}

export function tenantHeaders(extra = {}) {
  return { 'X-Tenant': getTenantSlug(), ...extra };
}

// Branding is authored in Super Admin and served from the platform control-plane.
// Falls back to the product API when the platform is unreachable (local dev).
export async function fetchBranding() {
  const slug = getTenantSlug();
  try {
    const res = await fetch(`${PLATFORM_API_URL}/api/v1/public/products/${slug}/branding`);
    if (res.ok) return res.json();
  } catch {
    // Fall through to product API.
  }
  const res = await fetch(`${API_URL}/api/v1/branding`, {
    headers: tenantHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load branding');
  return res.json();
}

// Live theme is chosen by Super Admin per product.
export async function fetchActiveTheme() {
  const slug = getTenantSlug();
  try {
    const res = await fetch(`${PLATFORM_API_URL}/api/v1/public/products/${slug}/theme`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.active_theme ?? null;
  } catch {
    return null;
  }
}
