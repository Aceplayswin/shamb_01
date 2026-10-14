// Product config for the web app.
//
// This build serves a single product. The backend identifies that product from
// its own api_key (control-plane config pull), so the frontend sends no tenant:
// branding and the live theme are fetched from the product API's keyless
// endpoints and apply to whichever product this API belongs to.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

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
