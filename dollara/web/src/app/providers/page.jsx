'use client';

// Thin route dispatcher — renders the active theme's "providers" page (the full
// game-provider directory behind the home page's "View All"). Data/auth/api are
// shared; only the rendered theme UI differs. The themed page reads ?q= itself
// to filter the directory, so it's wrapped in Suspense. See src/themes/registry.js.
import { Suspense } from 'react';
import { ThemePage } from '@/themes/ThemePage';

export default function ProvidersRoute() {
  return (
    <Suspense fallback={null}>
      <ThemePage routeKey="providers" />
    </Suspense>
  );
}
