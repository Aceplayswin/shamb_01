'use client';

// Home route — renders the active theme's home page. The theme (and its whole
// shell) is chosen by the super admin per product. See src/themes/registry.js.
import { ThemePage } from '@/themes/ThemePage';

export default function HomePage() {
  return <ThemePage routeKey="home" />;
}
