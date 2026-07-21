import { API_URL } from './tenant';

export function getAdminToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

export function setAdminToken(token) {
  localStorage.setItem('admin_token', token);
}

export function getAdminRole() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_role');
}

export function setAdminRole(role) {
  if (role) localStorage.setItem('admin_role', role);
}

export function clearAdminToken() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_role');
}

export async function adminApi(path, options = {}) {
  const token = getAdminToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearAdminToken();
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

export async function adminUploadImage(file) {
  const token = getAdminToken();
  const body = new FormData();
  body.append('file', file);

  const res = await fetch(`${API_URL}/api/v1/admin/upload`, {
    method: 'POST',
    headers: {      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  });

  if (res.status === 401) {
    clearAdminToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Upload failed');
  }
  return res.json();
}

export async function adminLogin(username, password) {
  const res = await fetch(`${API_URL}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error ?? 'Login failed');
  }
  const data = await res.json();
  setAdminToken(data.token);
  setAdminRole(data.role);
  return data;
}
