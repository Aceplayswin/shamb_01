// Product config for the agent panel.
//
// This build serves a single product. The backend identifies that product from
// its own api_key, so the frontend sends no tenant.

// Trailing slashes are stripped. Every call site joins `${API_URL}${path}` with
// a leading-slash path, so a base of `https://api.example.com/` would build
// `https://api.example.com//api/v1/...` — Django's resolver treats the extra
// leading segment as part of the path and 404s the whole panel.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000').replace(/\/+$/, '');

// Branding for this product (authored in Super Admin, delivered to the product
// API over the control plane and served here with no tenant argument).
export async function fetchBranding() {
  const res = await fetch(`${API_URL}/api/v1/branding`);
  if (!res.ok) throw new Error('Failed to load branding');
  return res.json();
}
