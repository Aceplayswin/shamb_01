import { API_URL } from './tenant';

export async function api(path, options = {}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
    if (res.status === 401 && err.code === 'SESSION_REVOKED') {
      notifySessionRevoked(message);
    }
    throw new Error(message);
  }
  return res.json();
}

// The backend rejects a token once the same account logs in elsewhere (see
// core/middleware.py:require_auth). Clear the stale token immediately and let
// the auth store know why, instead of waiting for a component to catch and
// handle this specific error itself.
function notifySessionRevoked(message) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  window.dispatchEvent(
    new CustomEvent('auth:session-revoked', { detail: { message } })
  );
}

// Multipart upload. Deliberately does NOT set Content-Type: the browser must
// set it itself so the multipart boundary is included — hard-coding
// application/json (as `api` does) makes the server reject the body.
export async function upload(path, file, field = 'file') {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const form = new FormData();
  form.append(field, file);

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? err.message ?? 'Upload failed');
  }
  return res.json();
}

export async function detectGeo() {
  return api('/api/v1/geo/detect');
}
