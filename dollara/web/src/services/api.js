import { API_URL, tenantHeaders } from './tenant';

export async function api(path, options = {}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...tenantHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const message =
      err.error ??
      err.message ??
      (err.status_code ? `${err.status_code.replace(/_/g, ' ')}` : null) ??
      'Request failed';
    throw new Error(message);
  }
  return res.json();
}

export async function detectGeo() {
  return api('/api/v1/geo/detect');
}
