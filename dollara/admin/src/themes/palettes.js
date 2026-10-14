// Per-theme color injection.
//
// Super Admin authors a color palette per theme (name/hex per token). This module
// knows how each theme's tokens map onto the CSS variables the theme's styles read
// (see app/globals.css + tailwind.config.js), and injects them at runtime.
//
// Fallback (requirement: "each theme runs on its default color if Super Admin
// fails"): every CSS variable is declared in globals.css as `var(--sa-x, <default>)`
// where the default IS the theme's own color. So if nothing is injected — cold
// start, Super Admin unreachable, or a token the operator never set — the baked-in
// default renders. Injection only ever *overrides*.
//
// Token keys mirror super_admin/api/tenants/theme_palettes.py and the offline
// defaults in dollara/api/services/theme_palettes.py. Keep the three in sync.

const TRIPLET = 'triplet'; // CSS var holds an "r g b" triplet (for rgb(... / alpha))
const HEX = 'hex'; // CSS var holds a hex string

// primaryToken → drives the tailwind brand-* ramp and --brand.
// accentToken  → sets --accent.
// vars         → token → [cssVar, format].
const GLASS_SPEC = {
  primaryToken: 'primary',
  accentToken: 'accent',
  vars: {
    app_bg: ['--sa-app-bg', TRIPLET],
    app_fg: ['--sa-app-fg', TRIPLET],
    rail: ['--sa-rail', TRIPLET],
    panel: ['--sa-panel', TRIPLET],
    panel_strong: ['--sa-panel-strong', TRIPLET],
    muted: ['--sa-muted', TRIPLET],
    hairline: ['--sa-hairline', TRIPLET],
  },
};

const THEME_SPECS = {
  theme1: GLASS_SPEC,
  theme2: GLASS_SPEC,
  theme3: {
    primaryToken: 'primary',
    accentToken: null,
    vars: {
      primary: ['--sa-t3-gold', HEX],
      t3_bg_a: ['--sa-t3-bg-a', HEX],
      t3_bg_b: ['--sa-t3-bg-b', HEX],
      t3_bg_c: ['--sa-t3-bg-c', HEX],
      t3_ink: ['--sa-t3-ink', HEX],
      t3_muted: ['--sa-t3-muted', HEX],
      t3_footer: ['--sa-t3-footer', HEX],
    },
  },
  theme4: {
    primaryToken: null,
    accentToken: null,
    vars: {
      t4_teal: ['--sa-t4-teal', HEX],
      t4_teal_bright: ['--sa-t4-teal-bright', HEX],
      t4_nav: ['--sa-t4-nav', HEX],
      t4_ink: ['--sa-t4-ink', HEX],
      t4_muted: ['--sa-t4-muted', HEX],
      t4_back: ['--sa-t4-back', HEX],
      t4_lay: ['--sa-t4-lay', HEX],
      t4_live: ['--sa-t4-live', HEX],
    },
  },
  theme5: {
    primaryToken: null,
    accentToken: null,
    vars: {
      t5_navy: ['--sa-t5-navy', HEX],
      t5_blue: ['--sa-t5-blue', HEX],
      t5_gold: ['--sa-t5-gold', HEX],
      t5_bg: ['--sa-t5-bg', HEX],
      t5_ink: ['--sa-t5-ink', HEX],
      t5_muted: ['--sa-t5-muted', HEX],
      t5_live: ['--sa-t5-live', HEX],
      t5_green: ['--sa-t5-green', HEX],
    },
  },
};

function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// "r g b" triplet for Tailwind's rgb(var(--x) / <alpha>) tokens.
function hexToTriplet(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? rgb.join(' ') : null;
}

function mix([r, g, b], [tr, tg, tb], amount) {
  const m = (a, t) => Math.round(a + (t - a) * amount);
  return [m(r, tr), m(g, tg), m(b, tb)];
}

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

// Derive a 50→950 tint/shade ramp from a single brand hex. Used only when Super
// Admin overrides the primary color; the default amber ramp lives in tailwind.config
// as the var() fallbacks, so an un-overridden theme keeps its hand-tuned ramp.
function deriveBrandRamp(hex) {
  const base = hexToRgb(hex);
  if (!base) return null;
  return {
    50: mix(base, WHITE, 0.92),
    100: mix(base, WHITE, 0.84),
    200: mix(base, WHITE, 0.66),
    300: mix(base, WHITE, 0.46),
    400: mix(base, WHITE, 0.22),
    500: base,
    600: mix(base, BLACK, 0.06),
    700: mix(base, BLACK, 0.22),
    800: mix(base, BLACK, 0.4),
    900: mix(base, BLACK, 0.55),
    950: mix(base, BLACK, 0.72),
  };
}

// Inject a theme's resolved colors as CSS variables on :root. `colors` is the
// server-resolved map (theme defaults already merged); anything missing simply
// isn't set, so the CSS var() default holds.
export function applyThemeColors(themeKey, colors) {
  if (typeof document === 'undefined' || !colors) return;
  const spec = THEME_SPECS[themeKey] || THEME_SPECS.theme1;
  const root = document.documentElement;

  Object.entries(spec.vars).forEach(([token, [cssVar, format]]) => {
    const value = colors[token];
    if (!value) return;
    if (format === TRIPLET) {
      const triplet = hexToTriplet(value);
      if (triplet) root.style.setProperty(cssVar, triplet);
    } else {
      root.style.setProperty(cssVar, value);
    }
  });

  if (spec.primaryToken && colors[spec.primaryToken]) {
    const primary = colors[spec.primaryToken];
    root.style.setProperty('--brand', primary);
    const ramp = deriveBrandRamp(primary);
    if (ramp) {
      Object.entries(ramp).forEach(([shade, rgb]) => {
        root.style.setProperty(`--brand-${shade}`, rgb.join(' '));
      });
    }
  }

  if (spec.accentToken && colors[spec.accentToken]) {
    root.style.setProperty('--accent', colors[spec.accentToken]);
  }
}
