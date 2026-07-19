import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchBranding, fetchActiveTheme } from '../services/tenant';
import { buildPalette, DEFAULT_THEME } from '../themes/palettes';

// Neutral defaults so the UI never hardcodes a brand and never flashes empty.
const DEFAULT_BRANDING = {
  product_name: '',
  logo_url: '',
  theme_color: '#F5C542',
  secondary_color: '#FFB800',
  colors: null,
  theme_key: null,
  support_email: '',
  support_phone: '',
  terms_url: '',
  privacy_url: '',
};

const BrandContext = createContext(DEFAULT_BRANDING);
const ThemeKeyContext = createContext(DEFAULT_THEME);
const PaletteContext = createContext(buildPalette(DEFAULT_THEME, null));

export function useBranding() {
  return useContext(BrandContext);
}

// The live theme key Super Admin selected for this product.
export function useProductTheme() {
  return useContext(ThemeKeyContext);
}

// Resolved colors + design tokens for the active theme. Every themed component
// reads this instead of importing a static palette.
export function useTheme() {
  return useContext(PaletteContext);
}

export function BrandProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [themeKey, setThemeKey] = useState(DEFAULT_THEME);

  useEffect(() => {
    let active = true;

    // Branding carries the palette; /api/v1/theme carries the live theme key.
    // Both are keyless and independent — a failure in either leaves the default
    // in place rather than blocking the app.
    fetchBranding()
      .then((data) => {
        if (!active || !data) return;
        setBranding({ ...DEFAULT_BRANDING, ...data });
        if (data.theme_key) setThemeKey(data.theme_key);
      })
      .catch(() => {});

    fetchActiveTheme()
      .then((key) => {
        if (active && key) setThemeKey(key);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const palette = useMemo(
    () => buildPalette(themeKey, branding.colors),
    [themeKey, branding.colors],
  );

  return (
    <BrandContext.Provider value={branding}>
      <ThemeKeyContext.Provider value={themeKey}>
        <PaletteContext.Provider value={palette}>{children}</PaletteContext.Provider>
      </ThemeKeyContext.Provider>
    </BrandContext.Provider>
  );
}
