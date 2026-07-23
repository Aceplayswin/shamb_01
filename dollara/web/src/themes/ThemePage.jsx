'use client';

// Renders the active theme's version of a given route. If the active theme (and
// the default theme, when bundled) don't provide that page, falls back to
// `children` — the route's shared default body — and finally to a neutral notice.
// This lets each route file stay thin while themes fully own their page UIs, and
// keeps every route renderable in a single-theme build where the theme1 fallback
// pages may not have been shipped.

import Link from 'next/link';
import { useProductTheme } from '@/hooks/useProductTheme';
import { resolvePage } from './registry';

export function ThemePage({ routeKey, children = null }) {
  const themeKey = useProductTheme();
  const Page = resolvePage(themeKey, routeKey);
  if (Page) return <Page />;
  if (children) return children;
  return <PageUnavailable />;
}

// Shown only when the shipped theme has no page for this route: a route the
// active theme doesn't implement renders a readable notice instead of a blank
// screen. Uses theme-aware tokens so it looks at home in any shell.
function PageUnavailable() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-xl font-semibold">This page isn&apos;t available</h1>
      <p className="mt-2 text-sm text-muted">
        This section isn&apos;t part of the current theme.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl border border-hairline/15 px-4 py-2 text-sm font-medium hover:border-hairline/30"
      >
        Back to Home
      </Link>
    </div>
  );
}
