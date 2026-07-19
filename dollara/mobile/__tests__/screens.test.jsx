/* eslint-env jest */

// Renders every theme1 screen against realistic API payloads.
//
// This is the cheapest place to catch the failures that a bundle build cannot:
// an undefined component, a bad destructure of an API field, a style token that
// doesn't exist on the palette. Each screen is mounted inside the same providers
// the real app wires up.

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BrandProvider } from '../src/hooks/useBranding';
import { resolveScreen, ROUTE_KEYS } from '../src/themes/registry';
import { setToken } from '../src/store/token';
import { useAuthStore } from '../src/store/auth';

const GAMES = [
  {
    id: 1,
    name: 'Aviator',
    slug: 'aviator',
    category: 'ai_games',
    game_uid: 'AVX1',
    thumbnail_url: null,
    rtp: 97.0,
    min_bet: 10,
    max_bet: 5000,
    is_featured: true,
    is_provably_fair: true,
    play_count: 42,
    provider_name: 'Aviatrix',
    provider_slug: 'aviatrix',
  },
  {
    id: 2,
    name: 'Live Roulette',
    slug: 'live-roulette',
    category: 'live_casino',
    game_uid: null,
    thumbnail_url: 'https://example.test/r.png',
    min_bet: 100,
    max_bet: 100000,
    is_featured: false,
    play_count: 7,
    provider_name: 'Evolution',
  },
  {
    id: 3,
    name: 'Cricket',
    slug: 'cricket',
    category: 'sports',
    min_bet: 50,
    max_bet: 9000,
    play_count: 3,
    provider_name: 'Saba',
  },
  {
    id: 4,
    name: 'Sweet Bonanza',
    slug: 'sweet-bonanza',
    category: 'slots',
    min_bet: 10,
    max_bet: 2000,
    is_featured: true,
    play_count: 19,
    provider_name: 'Pragmatic',
  },
];

const WALLET = {
  real: 5000,
  main: 5000,
  bonus: 250,
  total: 5250,
  exposure: 0,
  locked: 500,
  pendingWithdrawal: 500,
  currency: 'INR',
  available: 4500,
};

const ME = {
  id: 9,
  username: 'player9',
  full_name: 'Test Player',
  phone: '9990001111',
  kyc_status: 'verified',
  account_status: 'active',
  currency: 'INR',
  wallet: WALLET,
};

// Routed by URL so every screen gets the shape its own endpoint returns.
const ROUTES = [
  [/\/api\/v1\/branding/, { product_name: 'Dollara', theme_key: 'theme1', theme_color: '#F5C542', secondary_color: '#FFB800', colors: null }],
  [/\/api\/v1\/theme/, { active_theme: 'theme1' }],
  [/\/api\/v1\/games\/history\//, { rounds: [{ id: 1, game_round: 'R1', game_name: 'Aviator', created_at: '2026-01-02T10:00:00Z', bet_amount: 100, win_amount: 250, balance_after: 5150, profit_loss: 150, result: 'win' }] }],
  [/\/api\/v1\/games\/history/, { records: [{ session_uid: 'S1', game_name: 'Aviator', created_at: '2026-01-02T10:00:00Z', last_played_at: '2026-01-02T11:00:00Z', rounds: 4, pending_rounds: 1, total_bet: 400, total_win: 650, profit_loss: 250, result: 'win' }] }],
  [/\/api\/v1\/games\/pnl/, { total_bet: 400, total_win: 650, profit_loss: 250, pending_amount: 100, pending_rounds: 1 }],
  [/\/api\/v1\/games\/big-wins/, [{ id: 1, username: 'p***9', game_name: 'Aviator', win_amount: 12500, multiplier: 25, thumbnail_url: null }]],
  [/\/api\/v1\/games/, GAMES],
  [/\/api\/v1\/banners/, [{ id: 1, title: 'Welcome', image_url: 'https://example.test/b.png', link_url: '/promotions' }]],
  [/\/api\/v1\/promotions/, [{ id: 1, title: 'Welcome Bonus', bonus_type: 'deposit', value_type: 'percentage', value_amount: 100, max_bonus_cap: 5000, min_deposit: 500, wagering_multiplier: 5, has_promo_code: true, description: 'Double your first deposit.' }]],
  [/\/api\/v1\/bonuses\/mine/, [{ id: 1, title: 'Welcome Bonus', source: 'joining', amount: 250, status: 'active', wagering_required: 1250, wagering_completed: 500, created_at: '2026-01-01T00:00:00Z', expires_at: '2026-02-01T00:00:00Z' }]],
  [/\/api\/v1\/wallet\/breakdown/, { bonuses: [{ source: 'joining', label: 'Joining bonus', amount: 250 }], bonusTotal: 250, deposits: 10000, withdrawals: 2000, gamePlay: { staked: 400, won: 650, net: 250 } }],
  [/\/api\/v1\/wallet\/transactions/, [{ id: 1, type: 'deposit', amount: '1000.00', status: 'completed' }, { id: 2, type: 'withdrawal', amount: '500.00', status: 'pending' }]],
  [/\/api\/v1\/wallet/, WALLET],
  [/\/api\/v1\/settings/, { website_language: 'en', communication_language: 'en', currency: 'INR', notifications_enabled: true, marketing_opt_in: false, full_name: 'Test Player', username: 'player9', phone: '9990001111', email: 'p@example.test', kyc_status: 'verified', account_status: 'active' }],
  [/\/api\/v1\/referral/, { referral_code: 'PLAYER9', referred_count: 3 }],
  [/\/api\/v1\/app\/download/, { available: true, version: '1.4.0', size_mb: 24, min_android: '8.0', release_notes: 'Faster launches.', ios_url: '' }],
];

function payloadFor(url) {
  if (url.includes('/graphql')) return { data: { me: ME } };
  const hit = ROUTES.find(([pattern]) => pattern.test(url));
  return hit ? hit[1] : [];
}

beforeEach(() => {
  global.fetch = jest.fn((url) =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(payloadFor(String(url))),
    }),
  );
});

// Safe-area insets are normally measured natively; supply them directly so the
// provider resolves synchronously, as it does on a real device.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }) {
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      <BrandProvider>{children}</BrandProvider>
    </SafeAreaProvider>
  );
}

// A navigation stub covering everything the screens call.
function makeNavigation() {
  return {
    navigate: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    isFocused: () => true,
  };
}

const PARAMS = {
  play: { slug: 'aviator', name: 'Aviator' },
  games: { category: 'live-casino', title: 'Live Casino' },
  home: {},
};

async function renderScreen(routeKey) {
  const Screen = resolveScreen('theme1', routeKey);
  expect(Screen).toBeTruthy();

  const navigation = makeNavigation();
  const route = { key: routeKey, name: routeKey, params: PARAMS[routeKey] ?? {} };

  let tree;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <Providers>
        <Screen navigation={navigation} route={route} />
      </Providers>,
    );
  });
  // Let mount effects and their promise chains settle.
  await ReactTestRenderer.act(async () => {
    await Promise.resolve();
  });

  expect(tree.toJSON()).toBeTruthy();
  await ReactTestRenderer.act(async () => tree.unmount());
}

describe('theme1 screens', () => {
  // Signed-in: auth-guarded screens render their real content instead of
  // bouncing to login.
  beforeEach(() => {
    setToken('test.jwt.token');
    useAuthStore.setState({
      token: 'test.jwt.token',
      userId: ME.id,
      username: ME.username,
      user: ME,
      wallet: WALLET,
      isDemo: false,
      isHydrated: true,
    });
  });

  it.each(ROUTE_KEYS)('renders %s', async (routeKey) => {
    await renderScreen(routeKey);
  });
});

describe('theme1 screens when signed out', () => {
  beforeEach(() => {
    setToken(null);
    useAuthStore.setState({
      token: null,
      userId: null,
      username: null,
      user: null,
      wallet: null,
      isDemo: false,
      isHydrated: true,
    });
  });

  // Public screens must render for a logged-out visitor; the guarded ones are
  // expected to redirect, which is covered separately.
  it.each(['home', 'login', 'register', 'games', 'promotions', 'rules', 'support', 'appDownload'])(
    'renders %s',
    async (routeKey) => {
      await renderScreen(routeKey);
    },
  );

  it('sends a guarded screen to login', async () => {
    const Screen = resolveScreen('theme1', 'wallet');
    const navigation = makeNavigation();
    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(
        <Providers>
          <Screen navigation={navigation} route={{ key: 'wallet', name: 'wallet', params: {} }} />
        </Providers>,
      );
    });
    expect(navigation.replace).toHaveBeenCalledWith('login');
  });
});
