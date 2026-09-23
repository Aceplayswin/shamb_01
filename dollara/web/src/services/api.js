import { API_URL } from './tenant';
import { ATTRIBUTION_KEY } from '@/components/AttributionCapture';

/**
 * Attach affiliate attribution to a registration.
 *
 * Registration is themed — five separate AuthModals call this same `api()`
 * helper — so merging the fields here reaches all of them without touching a
 * single theme file. Guarded and wrapped in try/catch because attribution must
 * never be the reason somebody cannot sign up.
 */
function withAffiliateAttribution(path, options) {
  if (path !== '/api/v1/auth/register' || !options.body) return options;

  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return options;

    const attribution = JSON.parse(raw);
    if (!attribution?.ref) return options;

    return {
      ...options,
      body: JSON.stringify({
        ...JSON.parse(options.body),
        affiliateRef: attribution.ref,
        affiliateSub: attribution.sub,
        affiliateClickId: attribution.clk,
      }),
    };
  } catch {
    return options;
  }
}

export async function api(path, options = {}) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (typeof window !== 'undefined') {
    options = withAffiliateAttribution(path, options);
  }

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
    throw new Error(message);
  }
  return res.json();
}

// Multipart upload. Deliberately does NOT set Content-Type: the browser must
// set it itself so the multipart boundary is included — hard-coding
// application/json (as `api` does) makes the server reject the body. Used by
// the manual-deposit proof upload (ReceivingDetails) and any other
// screenshot/file submission.
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
