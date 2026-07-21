'use client';

// Thin route dispatcher — renders the active theme's "login" page.
// Data/auth/api are shared; only the rendered theme UI differs. The themed page
// may read dynamic params itself via useParams/useSearchParams, so it's wrapped
// in Suspense. See src/themes/registry.js.
import { Suspense } from 'react';
import { ThemePage } from '@/themes/ThemePage';

export default function LoginRoute() {
  return (
    <Suspense fallback={null}>
      <ThemePage routeKey="login" />
    </Suspense>
  );
}
