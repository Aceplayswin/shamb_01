'use client';

// Thin route dispatcher — renders the active theme's "transactions" page.
// Data/auth/api are shared; only the rendered theme UI differs. See
// src/themes/registry.js.
import { ThemePage } from '@/themes/ThemePage';

export default function TransactionsRoute() {
  return <ThemePage routeKey="transactions" />;
}
