'use client';

// Renders the active theme's version of a given route. If the active theme (and
// the default theme) don't provide that page, falls back to `children` — the
// route's shared default body. This lets each route file stay thin while themes
// fully own their page UIs.

import { useProductTheme } from '@/hooks/useProductTheme';
import { resolvePage } from './registry';

export function ThemePage({ routeKey, children = null }) {
  const themeKey = useProductTheme();
  const Page = resolvePage(themeKey, routeKey);
  if (Page) return <Page />;
  return children;
}
