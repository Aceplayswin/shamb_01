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
export const getProduct = (slug) =>
  superAdminApi(`/api/v1/super-admin/products/${slug}`);
export const updateProduct = (slug, payload) =>
  superAdminApi(`/api/v1/super-admin/products/${slug}/update`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
export const disableProduct = (slug) =>
  superAdminApi(`/api/v1/super-admin/products/${slug}/disable`, { method: 'POST' });
export const deleteProduct = (slug) =>
  superAdminApi(`/api/v1/super-admin/products/${slug}/delete`, { method: 'DELETE' });
export const provisionProduct = (slug) =>
  superAdminApi(`/api/v1/super-admin/products/${slug}/provision`, { method: 'POST' });
export const getUrls = (slug) =>
  superAdminApi(`/api/v1/super-admin/products/${slug}/urls`);
export const updateDatabase = (slug, payload) =>
  superAdminApi(`/api/v1/super-admin/products/${slug}/database`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
export const updateUrls = (slug, payload) =>
  superAdminApi(`/api/v1/super-admin/products/${slug}/urls`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
export const getBranding = (slug) =>
  superAdminApi(`/api/v1/super-admin/products/${slug}/branding`);
export const updateBranding = (slug, payload) =>
  superAdminApi(`/api/v1/super-admin/products/${slug}/branding`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
export const testConnection = (payload) =>
  superAdminApi('/api/v1/super-admin/test-connection', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const listThemes = () => superAdminApi('/api/v1/super-admin/themes');

// Per-product theme table.
export const getProductThemes = (slug) =>
  superAdminApi(`/api/v1/super-admin/products/${slug}/themes`);
export const activateProductTheme = (slug, themeKey) =>
  superAdminApi(`/api/v1/super-admin/products/${slug}/themes/activate`, {
    method: 'POST',
    body: JSON.stringify({ theme_key: themeKey }),
  });
export const setProductThemeEnabled = (slug, themeKey, isEnabled) =>
  superAdminApi(`/api/v1/super-admin/products/${slug}/themes/${themeKey}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ is_enabled: isEnabled }),
  });
