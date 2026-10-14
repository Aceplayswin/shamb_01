import { API_URL } from './tenant';

// Session storage for the affiliate portal.
//
// Mirrors dollara/admin's adminApi.js deliberately — that pattern is already
// proven against this API. The keys are namespaced so a portal session and an
// admin session can coexist in one browser without overwriting each other.

const TOKEN_KEY = 'affiliate_token';
const IDENTITY_KEY = 'affiliate_identity';
// The 2FA handle lives in sessionStorage, not localStorage: it is valid for
// minutes and should not outlive the tab.
const CHALLENGE_KEY = 'affiliate_2fa_challenge';

export function getAffiliateToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAffiliateToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function getAffiliateIdentity() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(IDENTITY_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setAffiliateIdentity(identity) {
  if (identity) localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function clearAffiliateToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(IDENTITY_KEY);
  sessionStorage.removeItem(CHALLENGE_KEY);
}

export function setChallengeToken(token) {
  sessionStorage.setItem(CHALLENGE_KEY, token);
}

export function getChallengeToken() {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(CHALLENGE_KEY);
}

/**
 * Call the affiliate API with the session token attached.
 *
 * `path` is the full path including /api/v1/. A 401 clears the session and
 * bounces to login — the token is either expired or the account was suspended,
 * and either way there is nothing useful left to render.
 */
export async function affiliateApi(path, options = {}) {
  const token = getAffiliateToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearAffiliateToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error(err.error ?? 'Request failed');
    // The API flags "approved but not onboarded" this way, so the caller can
    // redirect to onboarding rather than showing a dead end.
    error.status = res.status;
    error.needsOnboarding = Boolean(err.onboarding);
    throw error;
  }
  return res.json();
}

/** Multipart variant. Content-Type is omitted so the browser sets the boundary. */
export async function affiliateUpload(path, formData) {
  const token = getAffiliateToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });

  if (res.status === 401) {
    clearAffiliateToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Upload failed');
  }
  return res.json();
}

/**
 * Download an authenticated file.
 *
 * A plain <a download> cannot carry the Authorization header, so the response
 * has to be fetched as a blob and handed to a synthetic link.
 */
export async function affiliateDownload(path, filename) {
  const token = getAffiliateToken();
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

export async function fetchProgram() {
  const res = await fetch(`${API_URL}/api/v1/affiliate/program`);
  if (!res.ok) throw new Error('Failed to load programme details');
  return res.json();
}

export async function submitApplication(payload) {
  return publicPost('/api/v1/affiliate/apply', payload);
}

/**
 * Step one of login. Either returns a session, or a 2FA challenge that
 * /login/2fa completes.
 */
export async function affiliateLogin(email, password) {
  const data = await publicPost('/api/v1/affiliate/auth/login', { email, password });
  if (data.twoFactorRequired) {
    setChallengeToken(data.challengeToken);
    return data;
  }
  setAffiliateToken(data.token);
  setAffiliateIdentity(data);
  return data;
}

export async function affiliateVerify2fa(code) {
  const challengeToken = getChallengeToken();
  if (!challengeToken) throw new Error('This session has expired. Please log in again.');
  const data = await publicPost('/api/v1/affiliate/auth/2fa', { challengeToken, code });
  setAffiliateToken(data.token);
  setAffiliateIdentity(data);
  sessionStorage.removeItem(CHALLENGE_KEY);
  return data;
}

export async function requestPasswordReset(email) {
  return publicPost('/api/v1/affiliate/auth/forgot', { email });
}
