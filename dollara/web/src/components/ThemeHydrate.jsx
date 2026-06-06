'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/theme';

// The inline script in <head> already applies the right class before paint
// (avoiding a flash of the wrong theme); this just syncs store state to match.
export function ThemeHydrate({ children }) {
  const hydrate = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return children;
}

// Runs synchronously in <head>, before hydration, so the correct theme class
// is present on first paint. Stringified and inlined via <script dangerouslySetInnerHTML>.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`;
