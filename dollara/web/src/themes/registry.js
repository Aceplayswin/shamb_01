// Frontend theme registry.
//
// A theme is a COMPLETE UI/UX: its own shell (chrome: header/sidebar/footer/
// layout offsets) and its own version of EVERY page. The super admin chooses which
// theme a product renders (control plane); only RENDERING changes between themes —
// data fetching, auth, and API live above this layer (services/, hooks/, store/)
// and are shared by every theme.
//
// Valid theme keys are owned by the platform catalog
// (super_admin/api/tenants/themes.py). To add a theme: create src/themes/<key>/
// with a shell + pages and register it here.
//
// `pages` is keyed by ROUTE KEY (matches the routeKey each app/<route>/page.jsx
// dispatcher passes). A theme may provide only some pages; missing ones fall back
// to the default theme's page so a partially-built theme still works end to end.

import Theme1Shell from './theme1/shell/ThemeShell';
import Theme1Home from './theme1/pages/Home';
import Theme1Login from './theme1/pages/Login';
import Theme1Register from './theme1/pages/Register';
import Theme1Deposit from './theme1/pages/Deposit';
import Theme1Withdraw from './theme1/pages/Withdraw';
import Theme1Profile from './theme1/pages/Profile';
import Theme1Settings from './theme1/pages/settings';
import Theme1Onboarding from './theme1/pages/Onboarding';
import Theme1Support from './theme1/pages/Support';
import Theme1Games from './theme1/pages/Games';
import Theme1Play from './theme1/pages/Play';

import Theme2Shell from './theme2/shell/ThemeShell';
import Theme2Home from './theme2/pages/Home';
import Theme2Login from './theme2/pages/Login';
import Theme2Register from './theme2/pages/Register';
import Theme2Deposit from './theme2/pages/Deposit';
import Theme2Withdraw from './theme2/pages/Withdraw';
import Theme2Profile from './theme2/pages/Profile';
import Theme2Onboarding from './theme2/pages/Onboarding';
import Theme2Support from './theme2/pages/Support';
import Theme2Games from './theme2/pages/Games';
import Theme2Play from './theme2/pages/Play';

import Theme3Shell from './theme3/shell/ThemeShell';
import Theme3Home from './theme3/pages/Home';
import Theme3Login from './theme3/pages/Login';
import Theme3Register from './theme3/pages/Register';
import Theme3Deposit from './theme3/pages/Deposit';
import Theme3Withdraw from './theme3/pages/Withdraw';
import Theme3Profile from './theme3/pages/Profile';
import Theme3Onboarding from './theme3/pages/Onboarding';
import Theme3Support from './theme3/pages/Support';
import Theme3Games from './theme3/pages/Games';
import Theme3Play from './theme3/pages/Play';

export const DEFAULT_THEME = 'theme1';

const THEMES = {
  theme1: {
    Shell: Theme1Shell,
    pages: {
      home: Theme1Home,
      login: Theme1Login,
      register: Theme1Register,
      deposit: Theme1Deposit,
      withdraw: Theme1Withdraw,
      profile: Theme1Profile,
      settings: Theme1Settings,
      onboarding: Theme1Onboarding,
      support: Theme1Support,
      games: Theme1Games,
      play: Theme1Play,
    },
  },
  theme2: {
    Shell: Theme2Shell,
    pages: {
      home: Theme2Home,
      login: Theme2Login,
      register: Theme2Register,
      deposit: Theme2Deposit,
      withdraw: Theme2Withdraw,
      profile: Theme2Profile,
      onboarding: Theme2Onboarding,
      support: Theme2Support,
      games: Theme2Games,
      play: Theme2Play,
    },
  },
  theme3: {
    Shell: Theme3Shell,
    pages: {
      home: Theme3Home,
      login: Theme3Login,
      register: Theme3Register,
      deposit: Theme3Deposit,
      withdraw: Theme3Withdraw,
      profile: Theme3Profile,
      onboarding: Theme3Onboarding,
      support: Theme3Support,
      games: Theme3Games,
      play: Theme3Play,
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

// A page component for the active theme + route, falling back to the default
// theme's page, then null (route renders its own shared fallback body).
export function resolvePage(themeKey, routeKey) {
  const theme = getTheme(themeKey);
  return (
    theme.pages?.[routeKey] ??
    THEMES[DEFAULT_THEME].pages?.[routeKey] ??
    null
  );
}
