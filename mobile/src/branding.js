import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_BRANDING } from './tenant';
import { fetchBranding } from './services/api';
import { colors as baseColors } from './theme';

const BrandingContext = createContext(DEFAULT_BRANDING);

export function useBranding() {
  return useContext(BrandingContext);
}

// Base design tokens overridden by the active tenant's brand colors. Screens
// that should reflect per-product theming consume this instead of importing the
// static `colors` palette directly.
export function useThemeColors() {
  const branding = useBranding();
  return useMemo(
    () => ({
      ...baseColors,
      brand500: branding.theme_color || baseColors.brand500,
      brand400: branding.theme_color || baseColors.brand400,
      brand300: branding.secondary_color || baseColors.brand300,
      purple: branding.secondary_color || baseColors.purple,
    }),
    [branding.theme_color, branding.secondary_color]
  );
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);

  useEffect(() => {
    let active = true;
    fetchBranding()
      .then((data) => {
        if (active && data) setBranding({ ...DEFAULT_BRANDING, ...data });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => branding, [branding]);
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}
