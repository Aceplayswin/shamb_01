// src/lib/mockData.js
// All static/mock data used across dashboard pages.
// In Phase 2, replace these with real API fetch calls.

// ── Stat cards ──────────────────────────────────────────────────────────────
export const mockStats = {
  clicks:         12480,
  signups:        834,
  ftds:           312,
  activePlayers:  278,
  commission:     4820,   // USD
  pendingPayout:  1240,   // USD
};

// ── Commission over time (last 7 days) ──────────────────────────────────────
export const mockCommissionChart = [
  { day: 'Mon', amount: 520 },
  { day: 'Tue', amount: 780 },
  { day: 'Wed', amount: 430 },
  { day: 'Thu', amount: 910 },
  { day: 'Fri', amount: 650 },
  { day: 'Sat', amount: 1100 },
  { day: 'Sun', amount: 430 },
];

// ── Conversion funnel (for the funnel chart placeholder) ────────────────────
export const mockFunnel = [
  { label: 'Clicks',   value: 12480, pct: 100 },
  { label: 'Signups',  value: 834,   pct: 6.7 },
  { label: 'FTDs',     value: 312,   pct: 2.5 },
];

// ── Top performing tracking links ────────────────────────────────────────────
export const mockTopLinks = [
  { name: 'Homepage Banner Q3',   sub: 'q3-banner',  clicks: 3200, signups: 218, ftds: 84,  commission: 2040 },
  { name: 'Telegram Post — Slots',sub: 'tg-slots',   clicks: 2780, signups: 190, ftds: 71,  commission: 1705 },
  { name: 'YouTube Pre-Roll',     sub: 'yt-preroll', clicks: 2340, signups: 155, ftds: 59,  commission: 1420 },
  { name: 'Blog Review Article',  sub: 'blog-rev',   clicks: 1980, signups: 134, ftds: 50,  commission: 1210 },
  { name: 'Instagram Story Link', sub: 'ig-story',   clicks: 1450, signups:  98, ftds: 37,  commission:  890 },
];

// ── Recent referral activity feed ────────────────────────────────────────────
export const mockActivity = [
  { type: 'deposit',  text: 'Player #A8821 made their first deposit of $250',          time: '4 min ago' },
  { type: 'signup',   text: 'New player #B3312 signed up via your Telegram link',       time: '18 min ago' },
  { type: 'deposit',  text: 'Player #C9201 deposited $100 — commission credited',       time: '42 min ago' },
  { type: 'payout',   text: 'Payout of $1,240 has been approved and sent',              time: '2 hrs ago' },
  { type: 'signup',   text: 'New player #D4477 signed up via your Homepage Banner',     time: '3 hrs ago' },
  { type: 'deposit',  text: 'Player #E1122 made their first deposit of $500',           time: '5 hrs ago' },
  { type: 'signup',   text: 'New player #F5599 signed up via your YouTube Pre-Roll',    time: '6 hrs ago' },
  { type: 'payout',   text: 'Payout request of $800 is under review',                  time: 'Yesterday' },
  { type: 'deposit',  text: 'Player #G7743 deposited $75 — commission credited',        time: 'Yesterday' },
  { type: 'signup',   text: 'New player #H2231 signed up via your Blog Review Article', time: '2 days ago' },
];

// ── Referrals table (used by /referrals page) ────────────────────────────────
export const mockReferrals = [
  { id: 'A8821', signupDate: '2026-07-28', kyc: 'Verified',  ftdDate: '2026-07-29', ftdAmount: 250, lifetimeDeposits: 1200, commission: 420, status: 'active',  country: 'IN', lastActive: '2026-08-03', source: 'Homepage Banner Q3',    monthlyDeposits: [0, 0, 120, 280, 350, 450] },
  { id: 'B3312', signupDate: '2026-07-30', kyc: 'Pending',   ftdDate: null,         ftdAmount: 0,   lifetimeDeposits: 0,    commission: 0,   status: 'active',  country: 'BR', lastActive: '2026-08-02', source: 'Telegram Post — Slots', monthlyDeposits: [0, 0, 0, 0, 0, 0] },
  { id: 'C9201', signupDate: '2026-07-25', kyc: 'Verified',  ftdDate: '2026-07-26', ftdAmount: 100, lifetimeDeposits: 640,  commission: 220, status: 'active',  country: 'NG', lastActive: '2026-08-03', source: 'YouTube Pre-Roll',      monthlyDeposits: [0, 0, 0, 100, 240, 300] },
  { id: 'D4477', signupDate: '2026-07-22', kyc: 'Verified',  ftdDate: '2026-07-22', ftdAmount: 200, lifetimeDeposits: 980,  commission: 340, status: 'dormant', country: 'PH', lastActive: '2026-07-28', source: 'Blog Review Article',   monthlyDeposits: [0, 0, 200, 380, 400, 0] },
  { id: 'E1122', signupDate: '2026-07-18', kyc: 'Verified',  ftdDate: '2026-07-19', ftdAmount: 500, lifetimeDeposits: 3100, commission: 980, status: 'active',  country: 'US', lastActive: '2026-08-03', source: 'Instagram Story Link',  monthlyDeposits: [0, 500, 600, 700, 650, 650] },
  { id: 'F5599', signupDate: '2026-07-15', kyc: 'Verified',  ftdDate: '2026-07-16', ftdAmount: 75,  lifetimeDeposits: 420,  commission: 145, status: 'active',  country: 'DE', lastActive: '2026-08-01', source: 'Twitter Bio Link',      monthlyDeposits: [0, 75, 100, 85, 80, 80] },
  { id: 'G7743', signupDate: '2026-07-10', kyc: 'Verified',  ftdDate: '2026-07-11', ftdAmount: 150, lifetimeDeposits: 890,  commission: 310, status: 'active',  country: 'GB', lastActive: '2026-08-02', source: 'Discord Welcome DM',    monthlyDeposits: [0, 150, 180, 200, 180, 180] },
  { id: 'H2231', signupDate: '2026-07-08', kyc: 'Rejected',  ftdDate: null,         ftdAmount: 0,   lifetimeDeposits: 0,    commission: 0,   status: 'blocked', country: 'RU', lastActive: '2026-07-09', source: 'Homepage Banner Q3',    monthlyDeposits: [0, 0, 0, 0, 0, 0] },
  { id: 'J4410', signupDate: '2026-07-05', kyc: 'Verified',  ftdDate: '2026-07-06', ftdAmount: 300, lifetimeDeposits: 2200, commission: 760, status: 'active',  country: 'JP', lastActive: '2026-08-03', source: 'YouTube Pre-Roll',      monthlyDeposits: [300, 400, 380, 420, 350, 350] },
  { id: 'K6678', signupDate: '2026-06-28', kyc: 'Verified',  ftdDate: '2026-06-29', ftdAmount: 100, lifetimeDeposits: 560,  commission: 195, status: 'dormant', country: 'AU', lastActive: '2026-07-20', source: 'Blog Review Article',   monthlyDeposits: [100, 120, 140, 100, 100, 0] },
  { id: 'L9902', signupDate: '2026-06-20', kyc: 'Pending',   ftdDate: null,         ftdAmount: 0,   lifetimeDeposits: 0,    commission: 0,   status: 'active',  country: 'KE', lastActive: '2026-07-30', source: 'Telegram Post — Slots', monthlyDeposits: [0, 0, 0, 0, 0, 0] },
  { id: 'M1155', signupDate: '2026-06-15', kyc: 'Verified',  ftdDate: '2026-06-16', ftdAmount: 1000,lifetimeDeposits: 8500, commission: 2940,status: 'active',  country: 'AE', lastActive: '2026-08-03', source: 'Instagram Story Link',  monthlyDeposits: [1000, 1500, 1800, 1600, 1400, 1200] },
];

// ── Player activity timeline (used by referral detail panel) ──────────────────
export const mockPlayerActivity = [
  { type: 'signup',  text: 'Account created via tracking link', icon: 'user-plus' },
  { type: 'kyc',     text: 'KYC documents submitted',           icon: 'shield-check' },
  { type: 'ftd',     text: 'First deposit completed',           icon: 'banknote' },
  { type: 'deposit', text: 'Deposit — commission credited',     icon: 'arrow-down' },
  { type: 'active',  text: 'Player placed first bet',           icon: 'gamepad-2' },
];

// ── Earnings ledger (used by /finance/earnings page) ─────────────────────────
export const mockEarnings = [
  { period: 'Jul 21–27', type: 'Revenue Share', amount: 1840, status: 'paid' },
  { period: 'Jul 14–20', type: 'CPA',           amount: 960,  status: 'paid' },
  { period: 'Jul 07–13', type: 'Revenue Share', amount: 1240, status: 'paid' },
  { period: 'Jun 30–Jul 6', type: 'Hybrid',     amount: 780,  status: 'paid' },
  { period: 'Jul 28–Aug 3', type: 'Revenue Share', amount: 1240, status: 'pending' },
];

// ── Tracking Links (used by /links page) ─────────────────────────────────────
export const LANDING_PAGES = [
  { value: '/',            label: 'Homepage' },
  { value: '/register',    label: 'Register' },
  { value: '/casino',      label: 'Casino' },
  { value: '/sportsbook',  label: 'Sportsbook' },
  { value: '/slots',       label: 'Slots' },
  { value: '/live-casino', label: 'Live Casino' },
];

export const mockTrackingLinks = [
  { id: 'lnk-001', name: 'Homepage Banner Q3',    sub: 'q3-banner',  target: '/',           clicks: 3200, signups: 218, ftds: 84,  commission: 2040, created: '2026-06-15' },
  { id: 'lnk-002', name: 'Telegram Post — Slots', sub: 'tg-slots',   target: '/slots',      clicks: 2780, signups: 190, ftds: 71,  commission: 1705, created: '2026-06-22' },
  { id: 'lnk-003', name: 'YouTube Pre-Roll',      sub: 'yt-preroll',  target: '/register',   clicks: 2340, signups: 155, ftds: 59,  commission: 1420, created: '2026-07-01' },
  { id: 'lnk-004', name: 'Blog Review Article',   sub: 'blog-rev',   target: '/casino',     clicks: 1980, signups: 134, ftds: 50,  commission: 1210, created: '2026-07-08' },
  { id: 'lnk-005', name: 'Instagram Story Link',  sub: 'ig-story',   target: '/sportsbook', clicks: 1450, signups:  98, ftds: 37,  commission:  890, created: '2026-07-14' },
  { id: 'lnk-006', name: 'Twitter Bio Link',      sub: 'tw-bio',     target: '/',           clicks:  920, signups:  62, ftds: 24,  commission:  580, created: '2026-07-20' },
  { id: 'lnk-007', name: 'Discord Welcome DM',    sub: 'dc-welcome', target: '/register',   clicks:  680, signups:  48, ftds: 18,  commission:  435, created: '2026-07-25' },
];

// ── Creative banner assets (used by /links creative gallery tab) ─────────────
export const mockCreatives = [
  { id: 'cr-001', name: 'Gold Rush Banner',       size: '728x90',    label: 'Leaderboard',       color: 'from-brand-400 to-brand-600' },
  { id: 'cr-002', name: 'Casino Night Rectangle', size: '300x250',   label: 'Medium Rectangle',  color: 'from-purple-500 to-indigo-600' },
  { id: 'cr-003', name: 'Slots Mania Tower',      size: '160x600',   label: 'Skyscraper',        color: 'from-emerald-500 to-teal-600' },
  { id: 'cr-004', name: 'Social Promo Square',    size: '1080x1080', label: 'Social',            color: 'from-rose-500 to-orange-500' },
  { id: 'cr-005', name: 'Welcome Bonus Header',   size: '728x90',    label: 'Leaderboard',       color: 'from-sky-400 to-blue-600' },
  { id: 'cr-006', name: 'VIP Lounge Card',        size: '300x250',   label: 'Medium Rectangle',  color: 'from-amber-500 to-yellow-500' },
  { id: 'cr-007', name: 'Sports Bet Tower',       size: '160x600',   label: 'Skyscraper',        color: 'from-brand-500 to-orange-500' },
  { id: 'cr-008', name: 'Live Casino Social',     size: '1080x1080', label: 'Social',            color: 'from-violet-500 to-fuchsia-500' },
];
