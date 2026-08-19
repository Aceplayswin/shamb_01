// Product config for the agent panel.
//
// This build serves a single product. The backend identifies that product from
// its own api_key, so the frontend sends no tenant.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
