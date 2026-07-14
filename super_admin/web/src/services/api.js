const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TOKEN_KEY = 'super_admin_token';

export function getSuperAdminToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSuperAdminToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSuperAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function superAdminApi(path, options = {}) {
  const token = getSuperAdminToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearSuperAdminToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

export async function superAdminLogin(username, password) {
  const res = await fetch(`${API_URL}/api/v1/super-admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error ?? 'Login failed');
  }
  const data = await res.json();
  setSuperAdminToken(data.token);
  return data;
}

export const listProducts = () => superAdminApi('/api/v1/super-admin/products');
export const createProduct = (payload) =>
  superAdminApi('/api/v1/super-admin/products/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
// Products are addressed by numeric id; the api_key is a secret and never in a URL.
export const getProduct = (id) =>
  superAdminApi(`/api/v1/super-admin/products/${id}`);
export const updateProduct = (id, payload) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/update`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
export const disableProduct = (id) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/disable`, { method: 'POST' });
export const deleteProduct = (id) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/delete`, { method: 'DELETE' });
// Generate (or regenerate) the product's api_key — its PRODUCT_CONFIG_TOKEN.
export const generateApiKey = (id) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/api-key/generate`, { method: 'POST' });
export const getUrls = (id) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/urls`);
export const updateDatabase = (id, payload) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/database`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
export const updateUrls = (id, payload) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/urls`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
// Branding is per theme: pass the theme key so each theme gets its own
// name/logo/colors. Omit to target the product's live theme.
export const getBranding = (id, themeKey) =>
  superAdminApi(
    `/api/v1/super-admin/products/${id}/branding${themeKey ? `?theme=${encodeURIComponent(themeKey)}` : ''}`,
  );
export const updateBranding = (id, payload) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/branding`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
export const testConnection = (payload) =>
  superAdminApi('/api/v1/super-admin/test-connection', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// Product data explorer — read-only inspection of a product's tenant DB.
export const getProductDataSummary = (id) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/data/summary`);
export const getProductDataset = (id, dataset, { page = 1, pageSize = 50, q = '' } = {}) => {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (q) params.set('q', q);
  return superAdminApi(`/api/v1/super-admin/products/${id}/data/${dataset}?${params.toString()}`);
};

// Product webhook credentials (RSA key pair securing the data channel).
export const getProductCredential = (id) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/credential`);
export const generateProductCredential = (id) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/credential/generate`, {
    method: 'POST',
  });
export const rotateProductCredential = (id) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/credential/rotate`, {
    method: 'POST',
  });
export const markCredentialDelivered = (id) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/credential/mark-delivered`, {
    method: 'POST',
  });

// Webhook-based data fetch (PULL) — fetches a product's data over the signed
// webhook instead of connecting to its tenant database directly.
export const getProductWebhookSummary = (id) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/data-webhook/summary`);
export const getProductWebhookDataset = (id, dataset, { page = 1, pageSize = 50, q = '' } = {}) => {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (q) params.set('q', q);
  return superAdminApi(`/api/v1/super-admin/products/${id}/data-webhook/${dataset}?${params.toString()}`);
};
export const getProductWebhookDeliveries = (id, { limit = 50 } = {}) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/data-webhook/deliveries?limit=${limit}`);

export const listThemes = () => superAdminApi('/api/v1/super-admin/themes');

// Per-product theme table.
export const getProductThemes = (id) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/themes`);
export const activateProductTheme = (id, themeKey) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/themes/activate`, {
    method: 'POST',
    body: JSON.stringify({ theme_key: themeKey }),
  });
export const setProductThemeEnabled = (id, themeKey, isEnabled) =>
  superAdminApi(`/api/v1/super-admin/products/${id}/themes/${themeKey}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ is_enabled: isEnabled }),
  });
