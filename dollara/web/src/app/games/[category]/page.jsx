'use client';

// Thin route dispatcher — renders the active theme's "games" page.
// Data/auth/api are shared; only the rendered theme UI differs. The themed page
// reads dynamic params itself via useParams/useSearchParams (?q= filters the
// category by game name), so it's wrapped in Suspense. See src/themes/registry.js.
import { Suspense } from 'react';
import { ThemePage } from '@/themes/ThemePage';

export default function GamesRoute() {
  return (
    <Suspense fallback={null}>
      <ThemePage routeKey="games" />
    </Suspense>
  );
}
