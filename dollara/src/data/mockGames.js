export const MOCK_GAMES = {
  lottery: [
    { id: 'lot-1', name: 'Mega Draw', provider_name: 'LOTTO', category: 'lottery', rtp: 94, min_bet: 50, max_bet: 5000, is_provably_fair: true },
    { id: 'lot-2', name: 'Power Pick', provider_name: 'LOTTO', category: 'lottery', rtp: 92, min_bet: 100, max_bet: 10000 },
    { id: 'lot-3', name: 'Daily Jackpot', provider_name: 'PGGAMING', category: 'lottery', rtp: 91, min_bet: 25, max_bet: 2500 },
  ],
  live_casino: [
    { id: 'lc-1', name: 'Live Roulette', provider_name: 'INOUT', category: 'live_casino', rtp: 97, min_bet: 100, max_bet: 50000, is_provably_fair: true },
    { id: 'lc-2', name: 'Blackjack Live', provider_name: 'MAC88', category: 'live_casino', rtp: 99, min_bet: 200, max_bet: 100000 },
    { id: 'lc-3', name: 'Crazy Time', provider_name: 'SMARTSOFT', category: 'live_casino', rtp: 96, min_bet: 50, max_bet: 25000 },
    { id: 'lc-4', name: 'Monopoly Live', provider_name: 'AURA GAMING', category: 'live_casino', rtp: 95, min_bet: 100, max_bet: 30000 },
  ],
  sports: [
    { id: 'sp-1', name: 'Lucky Sports', provider_name: 'MAC88', category: 'sports', rtp: 95, min_bet: 100, max_bet: 200000 },
    { id: 'sp-2', name: 'E-Sports Arena', provider_name: 'VELIPLAY', category: 'sports', rtp: 94, min_bet: 50, max_bet: 50000 },
    { id: 'sp-3', name: 'Football Pro', provider_name: '18PEACHES', category: 'sports', rtp: 93, min_bet: 100, max_bet: 100000 },
  ],
  slots: [
    { id: 'sl-1', name: 'Aviator', provider_name: 'AVIATRIX', category: 'slots', rtp: 97, min_bet: 10, max_bet: 10000, is_provably_fair: true },
    { id: 'sl-2', name: 'Mines', provider_name: 'GALAXSYS', category: 'slots', rtp: 96, min_bet: 20, max_bet: 5000 },
    { id: 'sl-3', name: 'Forest Arrow', provider_name: 'TURBOGAMES', category: 'slots', rtp: 95, min_bet: 50, max_bet: 20000 },
    { id: 'sl-4', name: 'Cash Multiplier', provider_name: '2J', category: 'slots', rtp: 94, min_bet: 25, max_bet: 15000 },
  ],
  fantasy: [
    { id: 'fn-1', name: 'Dream11 Style', provider_name: 'DOLLARA', category: 'fantasy', rtp: 90, min_bet: 100, max_bet: 50000 },
    { id: 'fn-2', name: 'Cricket Fantasy', provider_name: 'DOLLARA', category: 'fantasy', rtp: 88, min_bet: 50, max_bet: 25000 },
  ],
  ai_games: [
    { id: 'ai-1', name: 'AI Predictor', provider_name: 'DOLLARA', category: 'ai_games', rtp: 92, min_bet: 100, max_bet: 10000, is_provably_fair: true },
    { id: 'ai-2', name: 'Smart Dice', provider_name: 'DOLLARA', category: 'ai_games', rtp: 96, min_bet: 50, max_bet: 5000, is_provably_fair: true },
  ],
};

export const FEATURED_GAMES = [
  MOCK_GAMES.slots[0],
  MOCK_GAMES.live_casino[2],
  MOCK_GAMES.sports[0],
  MOCK_GAMES.ai_games[0],
  MOCK_GAMES.lottery[0],
  MOCK_GAMES.slots[1],
];

export function getGamesByCategory(apiCategory) {
  return MOCK_GAMES[apiCategory] ?? [];
}

export const PROMOTIONS = [
  { id: 'p1', title: 'Welcome Bonus', subtitle: '5% up to ₹5,000', code: 'WELCOME5', icon: 'gift-outline' },
  { id: 'p2', title: 'First Deposit', subtitle: '50% bonus on ₹1,000+', code: 'FIRST50', icon: 'wallet-outline' },
  { id: 'p3', title: 'Weekend Cashback', subtitle: '10% on losses', code: 'WEEKEND10', icon: 'refresh-outline' },
  { id: 'p4', title: 'Refer & Earn', subtitle: '₹500 per friend', code: 'REFER500', icon: 'people-outline' },
];
