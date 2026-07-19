// Per-theme color resolution for React Native.
//
// The web injects Super Admin's palette as CSS variables (web/src/themes/palettes.js).
// RN has no cascade, so the equivalent here is to *build* a plain theme object
// that components read from context.
//
// Fallback (requirement: "each theme runs on its default color if Super Admin
// fails"): every token has the theme's own default baked in below. A cold start,
// an unreachable Super Admin, or a token the operator never set all fall through
// to that default. Overrides only ever replace a value that was supplied.
//
// Token keys mirror super_admin/api/tenants/theme_palettes.py, the offline
// defaults in dollara/api/services/theme_palettes.py, and the web injector.
// Keep them in sync.

/* ------------------------------- color math ------------------------------- */

export function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]) {
  const part = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function mix([r, g, b], [tr, tg, tb], amount) {
  const m = (a, t) => Math.round(a + (t - a) * amount);
  return [m(r, tr), m(g, tg), m(b, tb)];
}

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

// `rgba()` string from a hex + alpha. RN has no `rgb(var(--x) / <alpha>)`, so
// every translucent color in the UI goes through this.
export function withAlpha(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

// Derive a 50→950 tint/shade ramp from a single brand hex, matching the web's
// deriveBrandRamp so an operator's primary color produces identical shades on
// both clients.
function deriveBrandRamp(hex) {
  const base = hexToRgb(hex);
  if (!base) return null;
  return {
    50: toHex(mix(base, WHITE, 0.92)),
    100: toHex(mix(base, WHITE, 0.84)),
    200: toHex(mix(base, WHITE, 0.66)),
    300: toHex(mix(base, WHITE, 0.46)),
    400: toHex(mix(base, WHITE, 0.22)),
    500: toHex(base),
    600: toHex(mix(base, BLACK, 0.06)),
    700: toHex(mix(base, BLACK, 0.22)),
    800: toHex(mix(base, BLACK, 0.4)),
    900: toHex(mix(base, BLACK, 0.55)),
    950: toHex(mix(base, BLACK, 0.72)),
  };
}

/* ------------------------------ theme defaults ----------------------------- */

// The hand-tuned amber ramp from the web's tailwind.config. Used verbatim when
// Super Admin has NOT overridden the primary color, so an un-overridden theme
// keeps its designed ramp rather than a derived approximation.
const DEFAULT_BRAND_RAMP = {
  50: '#fffcf0',
  100: '#fff6d6',
  200: '#fcecae',
  300: '#f9df80',
  400: '#f7d35c',
  500: '#f5c542',
  600: '#ffb800',
  700: '#d99a00',
  800: '#a67700',
  900: '#7a5800',
  950: '#432f00',
};

// Fixed dark scale — ink on bright gradient buttons, game-card scrims, and any
// surface that must stay dark regardless of the theme's own background.
const SURFACE = {
  950: '#0B0F14',
  900: '#0e1318',
  800: '#151A21',
  700: '#1e252e',
  600: '#2a323d',
};

const STATUS = {
  emerald: { 300: '#7af0bb', 400: '#34e08a', 500: '#00D26A', 600: '#00b25a' },
  danger: { 300: '#ffb3b4', 400: '#ff7a7b', 500: '#FF4D4F', 600: '#e63b3d' },
  amber: { 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b' },
  sky: { 400: '#38bdf8' },
  rose: { 400: '#fb7185' },
};

// theme1 ("glass") — the dark palette from web/src/app/globals.css.
const GLASS_DEFAULTS = {
  primary: '#F5C542',
  accent: '#FFB800',
  app_bg: '#0B0F14',
  app_fg: '#FFFFFF',
  rail: '#0B0F14',
  panel: '#151A21',
  panel_strong: '#0B0F14',
  muted: '#9CA3AF',
  hairline: '#FFFFFF',
};

const THEME_DEFAULTS = {
  theme1: GLASS_DEFAULTS,
  // theme2 is registered but not yet built — see themes/registry.js. Its default
  // palette lives here so adding the theme's screens is all that's left to do.
  theme2: GLASS_DEFAULTS,
};

export const DEFAULT_THEME = 'theme1';

/* -------------------------------- the build -------------------------------- */

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 28, full: 999 };

export const typography = {
  hero: { fontSize: 34, fontWeight: '900', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '800' },
  section: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 14, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '500' },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
};

/**
 * Resolve a theme's palette into the object every themed component consumes.
 *
 * @param themeKey  which theme's defaults to start from
 * @param overrides Super Admin's `colors` map from /api/v1/branding (may be null)
 */
export function buildPalette(themeKey = DEFAULT_THEME, overrides = null) {
  const defaults = THEME_DEFAULTS[themeKey] ?? THEME_DEFAULTS[DEFAULT_THEME];
  // Drop empty values so a blank field in Super Admin can't wipe out a default.
  const clean = Object.fromEntries(
    Object.entries(overrides ?? {}).filter(([, v]) => typeof v === 'string' && v.trim()),
  );
  const t = { ...defaults, ...clean };

  // Only derive a ramp when the operator actually overrode the primary color;
  // otherwise keep the designed amber ramp.
  const brand =
    clean.primary && clean.primary.toLowerCase() !== defaults.primary.toLowerCase()
      ? deriveBrandRamp(clean.primary) ?? DEFAULT_BRAND_RAMP
      : DEFAULT_BRAND_RAMP;

  const hairline = t.hairline;

  return {
    key: themeKey,

    appBg: t.app_bg,
    appFg: t.app_fg,
    rail: t.rail,
    panel: t.panel,
    panelStrong: t.panel_strong,
    muted: t.muted,
    hairlineBase: hairline,

    brand,
    primary: t.primary,
    accent: t.accent,

    surface: SURFACE,
    ...STATUS,

    // Translucent helpers — the RN stand-in for Tailwind's `/[0.07]` modifiers.
    hairline: (a = 0.07) => withAlpha(hairline, a),
    fg: (a = 1) => withAlpha(t.app_fg, a),
    brandA: (shade, a) => withAlpha(brand[shade], a),
    panelA: (a = 1) => withAlpha(t.panel, a),
  };
}
