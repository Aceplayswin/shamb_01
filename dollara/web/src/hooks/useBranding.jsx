'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchBranding } from '@/services/tenant';
import { applyThemeColors } from '@/themes/palettes';

// The bundled mark, used whenever the platform hasn't set a brand logo. Every
// logo slot in the UI falls back to this instead of an improvised placeholder.
export const DEFAULT_LOGO_URL = '/logo.png';

// The favicon fallback is the emblem-only .ico rather than the wide lockup,
// which is illegible once a browser squeezes it into a 16px tab.
export const DEFAULT_FAVICON_URL = '/favicon.ico';

// Square 512px emblem for the home-screen / installed-app icon; the wide logo
// would be cropped to a circle by Android's maskable rules.
export const DEFAULT_APP_ICON_URL = '/icon.png';

// Neutral defaults so the UI never hardcodes a brand and never flashes empty.
const DEFAULT_BRANDING = {
  product_name: '',
  logo_url: DEFAULT_LOGO_URL,
  favicon_url: DEFAULT_FAVICON_URL,
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
  // Replace *every* icon link, not just the first: the document ships both the
  // .ico and a sized PNG, and browsers are free to pick the sized one, which
  // would keep showing the default over the brand's own favicon.
  setFavicon(branding.favicon_url || DEFAULT_FAVICON_URL);
  // Brand the installed-app icon: iOS reads apple-touch-icon at "Add to Home
  // Screen" time, so pointing it at the product's icon (like the favicon above)
  // gives the home-screen icon the brand's mark. Android uses the manifest icons.
  const appIcon = branding.app_icon_url || DEFAULT_APP_ICON_URL;
  upsertLink("link[rel='apple-touch-icon']", (l) => (l.rel = 'apple-touch-icon')).href = appIcon;
}

// Point the document at a single favicon, dropping any other icon links so no
// sized variant can win over it.
function setFavicon(href) {
  const links = document.querySelectorAll("link[rel~='icon']");
  links.forEach((l, i) => (i === 0 ? null : l.remove()));
  const link = links[0] ?? document.head.appendChild(document.createElement('link'));
  link.rel = 'icon';
  link.removeAttribute('sizes');
  link.href = href;
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
        // A tenant that hasn't uploaded a logo sends '' / null, which would
        // otherwise shadow the bundled default and leave the slot empty.
        const merged = { ...DEFAULT_BRANDING, ...data };
        if (!merged.logo_url) merged.logo_url = DEFAULT_LOGO_URL;
        if (!merged.favicon_url) merged.favicon_url = DEFAULT_FAVICON_URL;
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
