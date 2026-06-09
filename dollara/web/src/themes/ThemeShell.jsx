'use client';

// Renders the active theme's shell (chrome) around the app. Used once in the root
// layout. The shell owns the entire frame — header/sidebar/footer/offsets — so
// switching themes swaps the whole UI, not just the page body.

import { useProductTheme } from '@/hooks/useProductTheme';
import { resolveShell } from './registry';

export function ThemeShell({ children }) {
  const themeKey = useProductTheme();
  const Shell = resolveShell(themeKey);
  return <Shell>{children}</Shell>;
}
