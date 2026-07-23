// Theme 1 manifest — "Dollara" (dark glass).
//
// Everything this theme is lives under this folder: its shell (chrome), its
// pages, and any theme-scoped CSS. The registry auto-discovers themes by looking
// for `themes/<key>/index.js`, so a build that ships ONLY this folder works with
// no edits anywhere else — delete the sibling theme folders and the app still
// builds and runs. See ../registry.js and scripts/extract-theme.mjs.

import Shell from './shell/ThemeShell';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import Settings from './pages/settings';
import BetHistory from './pages/BetHistory';
import Promotions from './pages/Promotions';
import Bonus from './pages/Bonus';
import AppDownload from './pages/AppDownload';
import Refer from './pages/Refer';
import Rules from './pages/Rules';
import Onboarding from './pages/Onboarding';
import Games from './pages/Games';
import Play from './pages/Play';

// `pages` is keyed by ROUTE KEY — the key each src/app/<route>/page.jsx passes to
// <ThemePage routeKey="…">. Keys this theme omits fall back (registry.resolvePage).
export default {
  key: 'theme1',
  pages: {
    home: Home,
    login: Login,
    register: Register,
    deposit: Deposit,
    withdraw: Withdraw,
    wallet: Wallet,
    profile: Profile,
    settings: Settings,
    betHistory: BetHistory,
    promotions: Promotions,
    bonus: Bonus,
    appDownload: AppDownload,
    refer: Refer,
    rules: Rules,
    onboarding: Onboarding,
    games: Games,
    play: Play,
  },
  Shell,
};
