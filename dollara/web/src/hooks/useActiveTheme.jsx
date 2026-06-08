'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchActiveTheme } from '@/services/tenant';
import { DEFAULT_THEME, getTheme } from '@/themes';

// Holds which full UI theme/skin is active for this product. The key is decided
// by the Super Admin and served by the control plane; mirrors how useBranding
// resolves per-tenant branding. `resolved` lets the shell avoid flashing the
// default chrome before the real theme loads.
const ActiveThemeContext = createContext({
  themeKey: DEFAULT_THEME,
  theme: getTheme(DEFAULT_THEME),
  resolved: false,
});

export function useActiveTheme() {
  return useContext(ActiveThemeContext);
}

export function ActiveThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(DEFAULT_THEME);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let active = true;
    fetchActiveTheme()
      .then((key) => {
        if (!active) return;
        setThemeKey(key);
      })
      .finally(() => {
        if (active) setResolved(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({ themeKey, theme: getTheme(themeKey), resolved }),
    [themeKey, resolved],
  );

  return (
    <ActiveThemeContext.Provider value={value}>
      {children}
    </ActiveThemeContext.Provider>
  );
}
