// Wallet transaction vocabulary, shared by every theme's Transactions page.
// Only the rendering differs between themes; what counts as a credit, what
// counts as settled, and how a total is computed live here so the themes cannot
// drift apart on the arithmetic. Mirrors Transaction.TxType / Transaction.Status
// in api/core/models.py.

export const TX_LABELS = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  bonus_credit: 'Bonus Credit',
  bet_settlement: 'Bet Settlement',
  refund: 'Refund',
  adjustment: 'Adjustment',
};

// Types that move money INTO the wallet. A bet settlement is a payout (the
// stake itself is debited at play time by the games API), so it credits too.
// An adjustment can go either way; it is signed by the amount, handled below.
export const CREDIT_TYPES = new Set(['deposit', 'bonus_credit', 'bet_settlement', 'refund']);

// Transactions is the CASHIER view: money entering and leaving the wallet.
// Per-round play is its own story — stake, win, running balance — and it is told
// properly on /bet-history, where a row expands into its rounds. Mixing the two
// put a settlement line next to a deposit with no way to tell what it referred
// to, so play rows are filtered out here rather than rendered without context.
const PLAY_TYPES = new Set(['bet_settlement']);

/** The cashier rows: everything except per-round play settlements. */
export function isCashierTx(tx) {
  return !PLAY_TYPES.has(tx?.type);
}

/** Drop play rows from a raw wallet-transactions payload. */
export function cashierOnly(txs) {
  return (txs ?? []).filter(isCashierTx);
}

export const TX_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'deposit', label: 'Deposits' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'bonus_credit', label: 'Bonuses' },
];

// Money has actually moved only once the cashier has completed the transaction.
export function isSettled(status) {
  return status === 'completed';
}

// pending/processing are still in flight; the rest are terminal failures.
export function isInFlight(status) {
  return status === 'pending' || status === 'processing';
}

export function statusTone(status) {
  if (isSettled(status)) return 'good';
  if (isInFlight(status)) return 'warn';
  return 'bad'; // failed / rejected / cancelled
}

// Wallet totals. Only settled rows count toward credited/debited — an
// unapproved withdrawal has not left the wallet — while in-flight rows are
// surfaced separately so the player can see what is still awaiting approval.
export function summarise(txs) {
  let credited = 0;
  let debited = 0;
  let pending = 0;
  let pendingCount = 0;

  for (const t of txs ?? []) {
    const amount = Math.abs(Number(t.amount ?? 0));
    if (isInFlight(t.status)) {
      pending += amount;
      pendingCount += 1;
      continue;
    }
    if (!isSettled(t.status)) continue; // failed/rejected/cancelled move nothing
    if (CREDIT_TYPES.has(t.type)) credited += amount;
    else debited += amount;
  }

  return { credited, debited, pending, pendingCount, net: credited - debited };
}
