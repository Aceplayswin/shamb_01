'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { fetchActiveTheme } from '@/services/tenant';
import { DEFAULT_THEME } from '@/themes/registry';

// Holds the live theme key the super admin selected for this product. Components
// (notably the homepage) read it to render the matching theme. Until the
// platform responds we render the default theme so there is no blank flash.
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
        if (active && key) setThemeKey(key);
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
