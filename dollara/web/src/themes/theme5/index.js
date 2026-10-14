// Theme 5 manifest — "Velplay" (light three-column portal).
//
// Self-contained: shell + pages + this theme's own CSS (theme.css, scoped to
// .theme5-root) all live under this folder, so a build that ships only this
// theme works unchanged. See ../theme1/index.js for the annotated reference.

import './theme.css';

import Shell from './shell/ThemeShell';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';
import Support from './pages/Support';
import AppDownload from './pages/AppDownload';
import Games from './pages/Games';
import Providers from './pages/Providers';
import Play from './pages/Play';
import Promotions from './pages/Promotions';
import BetHistory from './pages/BetHistory';
import Transactions from './pages/Transactions';
import Bonus from './pages/Bonus';

export default {
  key: 'theme5',
  pages: {
    home: Home,
    login: Login,
    register: Register,
    deposit: Deposit,
    withdraw: Withdraw,
    wallet: Wallet,
    profile: Profile,
    onboarding: Onboarding,
    support: Support,
    appDownload: AppDownload,
    games: Games,
    providers: Providers,
    play: Play,
    promotions: Promotions,
    betHistory: BetHistory,
    transactions: Transactions,
    bonus: Bonus,
  },
  Shell,
};
