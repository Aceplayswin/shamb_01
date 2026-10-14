'use client';

// Home route — renders the active theme's home page. The theme (and its whole
// shell) is chosen by the super admin per product. See src/themes/registry.js.
// Wrapped in Suspense because the themed page reads the ?q= search param via
// useSearchParams (header search drives the home results).
import { Suspense } from 'react';
import { ThemePage } from '@/themes/ThemePage';

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <ThemePage routeKey="home" />
    </Suspense>
  );
}
