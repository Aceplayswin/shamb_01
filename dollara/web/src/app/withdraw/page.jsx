'use client';

// Thin route dispatcher — renders the active theme's "withdraw" page.
// Data/auth/api are shared; only the rendered theme UI differs. The themed page
// reads any dynamic params itself via useParams. See src/themes/registry.js.
import { ThemePage } from '@/themes/ThemePage';

export default function WithdrawRoute() {
  return <ThemePage routeKey="withdraw" />;
}
