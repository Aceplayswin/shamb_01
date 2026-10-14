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

// The branding upload keeps its original format (JPEG, PNG, WebP, SVG), so the
// manifest has to declare what the bytes actually are — see the icons note below.
function mimeFromUrl(url) {
  const ext = url.split('?')[0].split('#')[0].split('.').pop().toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  return 'image/png';
}

// Chrome needs a truthful pixel size for the icon it installs (see the icons
// note below), so read the real dimensions out of the image header. Only the
// square dimension is returned: a non-square logo is reported as its smaller
// side so the declared size never overstates what the file contains.
async function imageSize(url) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const d = pngSize(buf) ?? jpegSize(buf);
    if (!d) return null;
    return Math.min(d.w, d.h);
  } catch {
    return null;
  }
}

// PNG: width/height are the two big-endian uint32s of the IHDR chunk.
function pngSize(b) {
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// JPEG: walk the marker segments to the frame header (SOF0-SOF15, skipping the
// non-frame DHT/JPG/DAC markers) and read the dimensions out of it. Covers
// progressive JPEGs (SOF2), which is what the branding upload usually is.
function jpegSize(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
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
  const name = b.product_name || 'Mahakal World';

  // Prefer the dedicated app icon, then the logo, for the installed/home-screen
  // icon; keep the bundled defaults appended as a guaranteed-valid fallback so
  // installability never depends on branding having loaded.
  const iconUrl = b.app_icon_url || b.logo_url;
  // Chrome's install dialog ranks icons by declared pixel size and needs one at
  // least 192px to use it at all. `sizes: 'any'` does NOT satisfy that ranking —
  // it loses to the concrete 192x192 bundled PNG, which is why the generic icon
  // kept winning — and a size the bytes don't match gets the entry dropped. So
  // measure the real image and declare exactly that. If it can't be measured
  // (host down at build time), we skip the brand entry rather than guess.
  const dim = iconUrl ? await imageSize(iconUrl) : null;
  const icons = iconUrl && dim
    ? [
        // The type must match the real bytes (branding uploads are often JPEG):
        // the media host sends X-Content-Type-Options: nosniff, so a mismatched
        // type is rejected outright rather than sniffed and corrected.
        { src: iconUrl, sizes: `${dim}x${dim}`, type: mimeFromUrl(iconUrl), purpose: 'any' },
        // Deliberately NOT offered as `maskable`: Android crops a maskable icon
        // to its safe zone (the middle ~80%), which eats the edges of a logo
        // that wasn't authored with that padding. The bundled maskable below
        // stays the only one, so the mask always has something built for it.
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
