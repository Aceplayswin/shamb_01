'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { fetchActiveTheme } from '@/services/tenant';
import { DEFAULT_THEME, resolveThemeKey } from '@/themes/registry';

// Holds the live theme key the super admin selected for this product. Components
// (notably the homepage) read it to render the matching theme. Until the
// platform responds we render the default theme so there is no blank flash.
// The key is always clamped to a theme THIS build actually bundles, so a
// single-theme build keeps rendering its own theme even if the platform points
// at one that wasn't shipped.
const ProductThemeContext = createContext(DEFAULT_THEME);

export function useProductTheme() {
  return useContext(ProductThemeContext);
}

export function ProductThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(DEFAULT_THEME);

  useEffect(() => {
    let active = true;
    fetchActiveTheme()
      .then((key) => {
        if (active && key) setThemeKey(resolveThemeKey(key));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <ProductThemeContext.Provider value={themeKey}>
      {children}
    </ProductThemeContext.Provider>
  );
}
