// Frontend theme registry.
//
// A theme is a COMPLETE UI/UX: its own shell (chrome: header/sidebar/footer/
// layout offsets) and its own version of EVERY page. The super admin chooses which
// theme a product renders (control plane); only RENDERING changes between themes —
// data fetching, auth, and API live above this layer (services/, hooks/, store/)
// and are shared by every theme.
//
// THEMES ARE DISCOVERED, NOT LISTED. Every `src/themes/<key>/index.js` found at
// build time is registered automatically, so:
//   • adding a theme = create src/themes/<key>/ with a shell, pages and index.js
//   • shipping ONE theme = delete (or never copy) the other theme folders; nothing
//     else changes and the build still succeeds — no import in this file to edit.
// `npm run extract-theme -- <key> <dest>` does exactly that copy. Valid theme keys
// are owned by the platform catalog (super_admin/api/tenants/themes.py).
//
// `pages` in each manifest is keyed by ROUTE KEY (matching the routeKey each
// app/<route>/page.jsx dispatcher passes). A theme may provide only some pages;
// missing ones fall back to the default theme if it is bundled, else the route
// renders the shared unavailable-page notice (see ThemePage).

// require.context is webpack's directory scan, evaluated at build time: only
// folders that actually exist are bundled. `false` = don't recurse past the
// pattern; each theme's own imports pull in the rest of its folder.
const context = require.context('./', true, /^\.\/[^/]+\/index\.js$/);

const THEMES = {};

context.keys().forEach((path) => {
  const module = context(path);
  const theme = module?.default ?? module;
  if (!theme?.Shell) return; // not a theme manifest — ignore
  // Prefer the manifest's own key; fall back to the folder name ("./theme1/index.js").
  const key = theme.key ?? path.split('/')[1];
  THEMES[key] = theme;
});

// Every theme bundled in THIS build, sorted for stable ordering.
export const AVAILABLE_THEMES = Object.keys(THEMES).sort();

// The theme rendered before/without a super admin answer. theme1 is the platform
// default; in a single-theme build (where theme1 may not be the one shipped) the
// only bundled theme becomes the default, so the app never renders a theme it
// does not have.
const PLATFORM_DEFAULT = 'theme1';
export const DEFAULT_THEME = THEMES[PLATFORM_DEFAULT]
  ? PLATFORM_DEFAULT
  : AVAILABLE_THEMES[0] ?? PLATFORM_DEFAULT;

// Is this key bundled in this build?
export function hasTheme(themeKey) {
  return Boolean(themeKey && THEMES[themeKey]);
}

// Clamp any key (e.g. what the super admin returns) to a theme this build can
// actually render. A single-theme build ignores a key it wasn't shipped with.
export function resolveThemeKey(themeKey) {
  return hasTheme(themeKey) ? themeKey : DEFAULT_THEME;
}

export function getTheme(themeKey) {
  return THEMES[themeKey] ?? THEMES[DEFAULT_THEME] ?? null;
}

// Last-resort shell so the app still renders if no theme folder is present at all
// (a mis-copied build) instead of crashing on an undefined component.
function PassthroughShell({ children }) {
  return children;
}

// The shell (chrome) for the active theme.
export function resolveShell(themeKey) {
  return getTheme(themeKey)?.Shell ?? PassthroughShell;
}

// A page component for the active theme + route, falling back to the default
// theme's page, then null (route renders the shared fallback body).
export function resolvePage(themeKey, routeKey) {
  return (
    getTheme(themeKey)?.pages?.[routeKey] ??
    THEMES[DEFAULT_THEME]?.pages?.[routeKey] ??
    null
  );
}
