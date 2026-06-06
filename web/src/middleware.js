import { NextResponse } from 'next/server';

// Tenant resolution for the white-label web app. Determines the active product
// from the request host/subdomain (or a ?tenant= override / existing cookie in
// development) and exposes it to the app via the `x-tenant` cookie + request
// header so API calls and the branding engine target the right tenant.

const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
const DEFAULT_TENANT = process.env.NEXT_PUBLIC_DEFAULT_TENANT ?? 'dollara';

function slugFromHost(host) {
  if (!host) return null;
  const clean = host.split(':')[0].toLowerCase();
  if (LOCAL_HOSTS.has(clean)) return null;
  const labels = clean.split('.');
  if (labels.length >= 2 && !RESERVED_SUBDOMAINS.has(labels[0])) {
    return labels[0];
  }
  return null;
}

export function middleware(request) {
  const host = request.headers.get('host') || '';
  const queryTenant = request.nextUrl.searchParams.get('tenant');
  const cookieTenant = request.cookies.get('x-tenant')?.value;
  const slug = queryTenant || slugFromHost(host) || cookieTenant || DEFAULT_TENANT;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant', slug);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set('x-tenant', slug, { path: '/', sameSite: 'lax' });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
