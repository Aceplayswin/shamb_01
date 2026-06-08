'use client';

import { useActiveTheme } from '@/hooks/useActiveTheme';

// Thin shell: the active theme (chosen by the Super Admin, resolved by
// ActiveThemeProvider) decides which full UI skin renders. Each theme supplies
// its own Header / Home / Footer; see src/themes.
export default function HomePage() {
  const { theme, resolved } = useActiveTheme();

  // Hold the themed chrome until the active theme is known, so we never paint
  // one theme's header/footer and then swap to another's.
  if (!resolved) {
    return <div className="min-h-screen bg-app-bg" />;
  }

  const { Header, Home, Footer } = theme;
  return (
    <>
      <Header />
      <Home />
      <Footer />
    </>
  );
}
