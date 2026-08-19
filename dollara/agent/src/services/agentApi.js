import { API_URL } from './tenant';

// Session storage for the agent panel.
//
// Mirrors dollara/affiliate's affiliateApi.js deliberately — that pattern is
// already proven against this API. The keys are namespaced so an agent session,
// an affiliate session and an admin session can coexist in one browser without
// overwriting each other.

const TOKEN_KEY = 'agent_token';
const IDENTITY_KEY = 'agent_identity';

export function getAgentToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAgentToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function getAgentIdentity() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(IDENTITY_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setAgentIdentity(identity) {
  if (identity) localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function clearAgentToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(IDENTITY_KEY);
}

/**
 * Call the agent API with the session token attached.
 *
 * `path` is the full path including /api/v1/. A 401 clears the session and
 * bounces to login — the token is either expired or the account was closed,
 * and either way there is nothing useful left to render.
 */
export async function agentApi(path, options = {}) {
  const token = getAgentToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearAgentToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error(err.error ?? 'Request failed');
    error.status = res.status;
    throw error;
  }
  return res.json();
}

/** POST/PATCH helper — every write on this panel sends JSON. */
export function agentWrite(path, body, method = 'POST') {
  return agentApi(path, { method, body: JSON.stringify(body ?? {}) });
}

/**
 * Download an authenticated file — the "Download Excel" button on every report.
 *
 * A plain <a download> cannot carry the Authorization header, so the response
 * has to be fetched as a blob and handed to a synthetic link.
 */
export async function agentDownload(path, filename) {
  const token = getAgentToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Download failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

// --- Unauthenticated calls -------------------------------------------------

async function publicGet(path) {
  const res = await fetch(`${API_URL}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

async function publicPost(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

/** Programme terms for the landing page. */
export function fetchProgram() {
  return publicGet('/api/v1/agent/program');
}

export function submitApplication(payload) {
  return publicPost('/api/v1/agent/apply', payload);
}

/** An applicant checking their own status. Unknown addresses return the same
 *  shape as known ones, so this cannot be used to enumerate applicants. */
export function fetchApplicationStatus(email) {
  return publicGet(`/api/v1/agent/apply/status?email=${encodeURIComponent(email)}`);
}

/** Unauthenticated login. Stores the session on success. */
export async function agentLogin(username, password) {
  const res = await fetch(`${API_URL}/api/v1/agent/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Could not sign you in');
  setAgentToken(data.token);
  setAgentIdentity(data);
  return data;
}
