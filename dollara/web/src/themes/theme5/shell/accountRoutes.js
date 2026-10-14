// The player's own account pages — Deposit, Profile, Wallet, Bet History,
// Transactions, Promotions, My Bonuses and Change Password.
//
// These are focused, form-heavy tasks rather than browsing, so on phones the
// lobby chrome around them (the category row, the subcategory rail and the
// footer card) is hidden: it costs most of a small viewport before the player
// reaches the field they came for. Desktop keeps the full chrome — there the
// vertical space is not scarce. The header itself (brand + wallet + account
// actions) always stays, so the player can still navigate back out.

const ACCOUNT_ROUTES = [
  '/deposit',
  '/profile',
  '/wallet',
  '/bet-history',
  '/transactions',
  '/promotions',
  '/bonus',
  '/change-password',
];

// Prefix match, so nested pages (e.g. /profile/edit) hide the chrome too.
export function isAccountRoute(pathname) {
  if (!pathname) return false;
  return ACCOUNT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

// Tailwind classes that hide an element on phones but restore it from `sm:` up.
// Applied as a wrapper class rather than by dropping the element from the tree,
// so the desktop layout is byte-for-byte what it was and the markup stays
// identical between server and client render.
export const HIDE_ON_MOBILE = 'hidden sm:block';
