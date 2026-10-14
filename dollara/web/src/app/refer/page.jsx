'use client';

// Thin route dispatcher — renders the active theme's "refer & earn" page.
// Data/auth/api are shared; only the rendered theme UI differs. See
// src/themes/registry.js.
import { ThemePage } from '@/themes/ThemePage';

export default function ReferRoute() {
  return <ThemePage routeKey="refer" />;
}
