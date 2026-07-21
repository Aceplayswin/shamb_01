// Web App Manifest for the installable PWA. Served by Next at
// /manifest.webmanifest. This build serves a single product, so the manifest is
// branded from the product API's keyless /api/v1/branding (name, logo, colors) —
// the same source useBranding reads on the client. Fetched server-side and
// revalidated so a branding change in Super Admin reaches the installed app
// without a rebuild.
//
// Icons: when the product has a logo we point the install/splash icons at it so
// the home-screen icon is the brand's. The bundled default set
// (public/icon-*.png) is always appended as a guaranteed-valid fallback so the
// app stays installable even before branding loads or if the fetch fails.

import { API_URL } from '@/services/tenant';

// Re-fetch branding at most every 5 minutes (build-time fetch may fail when the
// API isn't reachable; that's caught below and the defaults are used instead).
export const revalidate = 300;

// The app chrome is dark, so both the splash background and the standalone
// status-bar tint (theme_color) use it; the brand colour shows through the icon
// and the in-app UI rather than a clashing coloured system bar.
const APP_BG = '#0B0F14'; // matches --color-app-bg

const DEFAULT_ICONS = [
  { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

// Home-screen labels get ~12 chars before the OS truncates. Prefer the whole
// name, else the first word if that fits, else a hard cut — never a mid-word stub.
function shortName(name) {
  if (name.length <= 12) return name;
  const first = name.split(/\s+/)[0];
  return first.length <= 12 ? first : name.slice(0, 12);
}

async function loadBranding() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${API_URL}/api/v1/branding`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function manifest() {
  const b = (await loadBranding()) ?? {};
  const name = b.product_name || 'Gaming App';

  // Prefer the dedicated app icon, then the logo, for the installed/home-screen
  // icon; keep the bundled defaults appended as a guaranteed-valid fallback so
  // installability never depends on branding having loaded.
  const iconUrl = b.app_icon_url || b.logo_url;
  const icons = iconUrl
    ? [
        { src: iconUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: iconUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: iconUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ...DEFAULT_ICONS,
      ]
    : DEFAULT_ICONS;

  return {
    name,
    short_name: shortName(name),
    description: `${name} — play casino, sports, slots and more.`,
    id: '/',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: APP_BG,
    theme_color: APP_BG,
    categories: ['games', 'entertainment'],
    icons,
  };
}
