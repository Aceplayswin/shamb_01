// Mobile theme registry.
//
// A theme is a COMPLETE UI/UX: its own shell (chrome: top bar / bottom tabs /
// drawer) and its own version of EVERY screen. Super Admin chooses which theme a
// product renders (control plane); only RENDERING changes between themes — data
// fetching, auth, and API live above this layer (services/, hooks/, store/) and
// are shared by every theme.
//
// This mirrors web/src/themes/registry.js so a theme means the same thing on
// both clients and the same theme key renders the matching design in each.
//
// `screens` is keyed by ROUTE KEY, matching the web's page keys. A theme may
// provide only some screens; missing ones fall back to the default theme's
// screen, so a partially-built theme still works end to end.
//
// Only theme1 is built today. theme2 is intentionally left unregistered rather
// than aliased to theme1: falling through to DEFAULT_THEME already renders
// theme1 for any key we don't know, so pointing theme2 at theme1's screens would
// claim a design that doesn't exist yet. To add it, create src/themes/theme2/
// with a shell + screens and register it below.

import Theme1Shell from './theme1/shell/ThemeShell';
import Theme1Home from './theme1/pages/Home';
import Theme1Login from './theme1/pages/Login';
import Theme1Register from './theme1/pages/Register';
import Theme1Deposit from './theme1/pages/Deposit';
import Theme1Withdraw from './theme1/pages/Withdraw';
import Theme1Wallet from './theme1/pages/Wallet';
import Theme1Profile from './theme1/pages/Profile';
import Theme1Settings from './theme1/pages/Settings';
import Theme1BetHistory from './theme1/pages/BetHistory';
import Theme1Promotions from './theme1/pages/Promotions';
import Theme1Bonus from './theme1/pages/Bonus';
import Theme1AppDownload from './theme1/pages/AppDownload';
import Theme1Refer from './theme1/pages/Refer';
import Theme1Rules from './theme1/pages/Rules';
import Theme1Onboarding from './theme1/pages/Onboarding';
import Theme1Support from './theme1/pages/Support';
import Theme1Games from './theme1/pages/Games';
import Theme1Play from './theme1/pages/Play';

export const DEFAULT_THEME = 'theme1';

const THEMES = {
  theme1: {
    Shell: Theme1Shell,
    screens: {
      home: Theme1Home,
      login: Theme1Login,
      register: Theme1Register,
      deposit: Theme1Deposit,
      withdraw: Theme1Withdraw,
      wallet: Theme1Wallet,
      profile: Theme1Profile,
      settings: Theme1Settings,
      betHistory: Theme1BetHistory,
      promotions: Theme1Promotions,
      bonus: Theme1Bonus,
      appDownload: Theme1AppDownload,
      refer: Theme1Refer,
      rules: Theme1Rules,
      onboarding: Theme1Onboarding,
      support: Theme1Support,
      games: Theme1Games,
      play: Theme1Play,
    },
  },
};

export function getTheme(themeKey) {
  return THEMES[themeKey] ?? THEMES[DEFAULT_THEME];
}

// The shell (chrome) for the active theme.
export function resolveShell(themeKey) {
  return getTheme(themeKey).Shell;
}

// A screen component for the active theme + route, falling back to the default
// theme's screen.
export function resolveScreen(themeKey, routeKey) {
  const theme = getTheme(themeKey);
  return theme.screens?.[routeKey] ?? THEMES[DEFAULT_THEME].screens?.[routeKey] ?? null;
}

// Route keys every theme must be able to render, in navigator order.
export const ROUTE_KEYS = Object.keys(THEMES[DEFAULT_THEME].screens);
