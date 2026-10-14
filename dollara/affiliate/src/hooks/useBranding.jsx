'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchBranding } from '@/services/tenant';

// Neutral defaults so the UI never hardcodes a brand and never flashes empty.
const DEFAULT_BRANDING = {
  product_name: '',
  logo_url: '',
  favicon_url: '',
};

const BrandContext = createContext(DEFAULT_BRANDING);

export function useBranding() {
  return useContext(BrandContext);
}

function applyBranding(branding) {
  if (typeof document === 'undefined') return;
  if (branding.product_name) {
    document.title = `${branding.product_name} Affiliates`;
  }
  if (branding.favicon_url) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = branding.favicon_url;
  }
}

export function BrandProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);

  useEffect(() => {
    let active = true;
    fetchBranding()
      .then((data) => {
        if (!active || !data) return;
        const merged = { ...DEFAULT_BRANDING, ...data };
        setBranding(merged);
        applyBranding(merged);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => branding, [branding]);
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}
