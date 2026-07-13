import { API_URL } from '../tenant';
import { useAuthStore } from '../store/auth';

// This build serves a single product. The backend identifies that product from
// its own api_key, so requests carry no tenant header.

export async function api(path, options = {}) {
  const token = useAuthStore.getState().token;

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
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

export async function detectGeo() {
  return api('/api/v1/geo/detect');
}

export async function fetchBranding() {
  const res = await fetch(`${API_URL}/api/v1/branding`);
  if (!res.ok) throw new Error('Failed to load branding');
  return res.json();
}

export async function fetchMe() {
  const token = useAuthStore.getState().token;
  if (!token) return null;

  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: `
        query Me {
          me {
            id
            username
            full_name
            phone
            kyc_status
            account_status
            currency
            wallet {
              main
              bonus
              exposure
              locked
              available
              currency
            }
          }
        }
      `,
    }),
  });

  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
  return json.data?.me ?? null;
}
