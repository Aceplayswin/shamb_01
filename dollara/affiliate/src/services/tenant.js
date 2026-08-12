// Product config for the affiliate portal.
//
// This build serves a single product. The backend identifies that product from
// its own api_key, so the frontend sends no tenant: branding and the live theme
// come from the product API's keyless endpoints.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
export const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';

// Branding for this product (authored in Super Admin, delivered to the product
// API over the control plane and served here with no tenant argument).
export async function fetchBranding() {
  const res = await fetch(`${API_URL}/api/v1/branding`);
  if (!res.ok) throw new Error('Failed to load branding');
  return res.json();
}
