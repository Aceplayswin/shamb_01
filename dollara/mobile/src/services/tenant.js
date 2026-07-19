// Product config for the mobile app.
//
// This build serves a single product. The backend identifies that product from
// its own api_key, so the app sends no tenant: branding and the live theme come
// from the product API's keyless endpoints.

import { API_URL } from '../config';

export { API_URL };

// Branding for this product (authored in Super Admin, delivered to the product
// API over the control plane and served here with no tenant argument).
export async function fetchBranding() {
  const res = await fetch(`${API_URL}/api/v1/branding`);
  if (!res.ok) throw new Error('Failed to load branding');
  return res.json();
}

// The live theme key Super Admin selected for this product.
export async function fetchActiveTheme() {
  try {
    const res = await fetch(`${API_URL}/api/v1/theme`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.active_theme ?? null;
  } catch {
    return null;
  }
}
