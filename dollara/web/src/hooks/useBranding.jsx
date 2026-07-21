'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchBranding } from '@/services/tenant';
import { applyThemeColors } from '@/themes/palettes';

// Neutral defaults so the UI never hardcodes a brand and never flashes empty.
const DEFAULT_BRANDING = {
  product_name: '',
  logo_url: '',
  favicon_url: '',
  app_icon_url: '',
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

export function useBranding() {
  return useContext(BrandContext);
}

function applyBranding(branding) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  // Apply the full per-theme color palette (Super Admin overrides over the theme's
  // own defaults). The theme the colors belong to is resolved server-side.
  if (branding.colors) {
    applyThemeColors(branding.theme_key, branding.colors);
  } else {
    // Older payloads without a colors map: still honor the two brand anchors.
    if (branding.theme_color) root.style.setProperty('--brand', branding.theme_color);
    if (branding.secondary_color) root.style.setProperty('--accent', branding.secondary_color);
  }
  if (branding.product_name) {
    document.title = `${branding.product_name} - Online Gaming Platform`;
    // iOS home-screen label when the PWA is added from Safari.
    upsertMeta('apple-mobile-web-app-title', branding.product_name);
  }
  if (branding.favicon_url) {
    upsertLink("link[rel~='icon']", (l) => (l.rel = 'icon')).href = branding.favicon_url;
  }
  // Brand the installed-app icon: iOS reads apple-touch-icon at "Add to Home
  // Screen" time, so pointing it at the product's icon (like the favicon above)
  // gives the home-screen icon the brand's mark. Android uses the manifest icons.
  const appIcon = branding.app_icon_url || branding.logo_url;
  if (appIcon) {
    upsertLink("link[rel='apple-touch-icon']", (l) => (l.rel = 'apple-touch-icon')).href = appIcon;
  }
}

// Find a <link> matching `selector`, or create one (initialised by `init`) and
// append it to <head>. Returns the element so the caller can set href.
function upsertLink(selector, init) {
  let link = document.querySelector(selector);
  if (!link) {
    link = document.createElement('link');
    init(link);
    document.head.appendChild(link);
  }
  return link;
}

function upsertMeta(name, content) {
  let meta = document.querySelector(`meta[name='${name}']`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
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
