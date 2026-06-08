// Client-side tenant resolution for the white-label web app.
// The Next.js middleware (src/middleware.js) sets an `x-tenant` cookie based on
// the request host/subdomain; here we read it (falling back to the hostname or
// the configured default) so every API call can carry an `X-Tenant` header.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
// Super Admin control plane — source of truth for which UI theme is active.
export const SUPER_ADMIN_URL = process.env.NEXT_PUBLIC_SUPER_ADMIN_URL ?? 'http://localhost:5000';
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

export async function fetchBranding() {
  const res = await fetch(`${API_URL}/api/v1/branding`, {
    headers: tenantHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load branding');
  return res.json();
}

// Which full UI theme/skin this product renders, decided by the Super Admin and
// served by the control plane. Returns the active theme key, falling back to
// 'theme1' on any error so the site always renders the default skin. A short
// timeout guards against a slow/hanging control plane blocking first paint.
export async function fetchActiveTheme() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const slug = getTenantSlug();
    const res = await fetch(
      `${SUPER_ADMIN_URL}/api/v1/super-admin/public/theme?slug=${encodeURIComponent(slug)}`,
      { signal: controller.signal },
    );
    if (!res.ok) return 'theme1';
    const data = await res.json();
    return data?.active_theme || 'theme1';
  } catch {
    return 'theme1';
  } finally {
    clearTimeout(timeout);
  }
}
