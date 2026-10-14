'use client';

/**
 * The player profile popup opened from the Users list.
 *
 * Mirrors the reference backoffice's player screen: a three-column User Details
 * grid, the action row, then one panel per record set — notes, game statistics,
 * bonuses, the cashier tables and sports bet history. Every panel renders even
 * when empty, because an operator reads the absence of rows as information.
 */

import { useState } from 'react';
import { Receipt } from 'lucide-react';
import {
  Modal,
  Button,
  StatusBadge,
  TxReference,
  Pagination,
  inr,
  fmtDate,
} from './AdminShell';

const dash = (v) =>
  v === null || v === undefined || v === '' ? '—' : v;

const yesNo = (v) => (v ? 'Yes' : 'No');

/** "Bet on Zimbabwe Back" — exchange bets carry a back/lay side; aggregator
 *  sportsbook selections don't, so those read "Bet on India A" instead. */
const betOnLabel = (r) => {
  if (!r.selection_name) return '—';
  const side = r.side ? ` ${r.side === 'lay' ? 'Lay' : 'Back'}` : '';
  return `Bet on ${r.selection_name}${side}`;
};

/** Cashier rows cover more than deposits/withdrawals — an admin adjustment or a
 *  refund shows up in the same tables, so each row names its own type. */
const TX_TYPE_LABELS = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  adjustment: 'Adjustment',
  refund: 'Refund',
};

const txTypeLabel = (t) => TX_TYPE_LABELS[t] ?? dash(t);

/** One "Label ......... value" line in the User Details grid. */
function DetailRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-800 py-2">
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
      <span className="truncate text-right text-sm font-medium text-slate-200">
        {dash(value)}
      </span>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h4 className="mb-3 font-display text-sm font-bold text-white">{title}</h4>
      {children}
    </section>
  );
}

/**
 * A read-only table panel. `columns` is [{ label, render }]; `rows` is the data.
 * Scrolls horizontally on its own so a wide table never widens the modal.
 * Rows are paged client-side (the payload already carries them all) so no
 * panel grows into one long list; `noun` names them in the pager's label.
 */
function PanelTable({ title, columns, rows, noun, pageSize = 10 }) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(pageSize);
  const total = rows?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const visible = rows?.slice(safePage * perPage, safePage * perPage + perPage);

  return (
    <Panel title={title}>
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60">
              {columns.map((c) => (
                <th
                  key={c.label}
                  className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-300"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible?.length ? (
              visible.map((r, i) => (
                <tr
                  key={r.id ?? i}
                  className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30"
                >
                  {columns.map((c) => (
                    <td
                      key={c.label}
                      className="whitespace-nowrap px-3 py-2.5 text-slate-300"
                    >
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-4 text-sm text-slate-500"
                >
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <Pagination
          page={safePage}
          totalPages={totalPages}
          onPage={setPage}
          total={total}
          perPage={perPage}
          onPerPage={(n) => {
            setPerPage(n);
            setPage(0);
          }}
          noun={noun}
        />
      </div>
    </Panel>
  );
}

/** The match/market context behind one sports stake — opened from the ID
 *  column of Player Bet History (Sports). Everything shown here already rides
 *  along on the row the table has in hand, so it's a pure client-side view,
 *  no extra fetch. */
function SportBetDetailModal({ bet, onClose }) {
  return (
    <Modal open={!!bet} onClose={onClose} title="Bet Detail" size="sm">
      {bet && (
        <div>
          <DetailRow label="Match Name" value={bet.event_name} />
          <DetailRow label="Match ID" value={bet.event_key} />
          <div className="my-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-center text-sm font-semibold text-white">
            {betOnLabel(bet)}
          </div>
          <DetailRow label="Betted Time" value={fmtDate(bet.placed_at ?? bet.created_at)} />
          <DetailRow label="Sport Name" value={bet.sport} />
          <DetailRow label="League Name" value={bet.league} />
          <DetailRow label="Market Name" value={bet.market_name} />
          {/* The market's winning side — set once it resolves. Left blank
              rather than guessed where it can't be said for sure (still
              pending, or not a clean two-way market). */}
          <DetailRow label="Won" value={bet.winner} />
          <DetailRow
            label="Profit/Loss"
            value={
              bet.profit_loss == null ? null : (
                <span
                  className={bet.profit_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                >
                  {inr(bet.profit_loss)}
                </span>
              )
            }
          />
        </div>
      )}
    </Modal>
  );
}

// User Details, grouped into three columns of near-equal height:
// account identity · money · activity. Each row is [label, value].
function detailColumns(d) {
  return [
    {
      key: 'account',
      rows: [
        ['Id', d.id],
        ['Username', d.username],
        ['Full Name', d.full_name],
        ['Phone No', d.phone],
        ['Country', d.country_code],
        ['Signup Date', fmtDate(d.created_at)],
        ['Signup IP', d.signup_ip],
        ['Status', <StatusBadge status={d.account_status} />],
      ],
    },
    {
      key: 'balances',
      rows: [
        ['Balance', inr((d.main_balance || 0) + (d.bonus_balance || 0))],
        ['Real Balance', inr(d.main_balance)],
        ['Sports Bonus Balance', inr(d.sports_bonus_balance)],
        ['Casino Bonus Balance', inr(d.bonus_balance)],
        ['Exchange Bonus Amount', inr(d.exposure_balance)],
        ['Wagering Balance', inr(d.wagering_balance)],
        ['Deposit Amount', inr(d.deposit_amount)],
        ['Withdraw Amount', inr(d.withdraw_amount)],
      ],
    },
    {
      key: 'activity',
      rows: [
        ['Gross Profit', inr(d.gross_profit)],
        ['Net Profit', inr(d.net_profit)],
        ['Total Plays', d.total_plays],
        ['Games Played With Real Money', d.games_played_with_real_money],
        ['Visits', d.visits],
        ['Last Logged IP', d.last_logged_ip],
        ['Affiliate User', d.affiliate_id ? `Yes (#${d.affiliate_id})` : 'No'],
        // Referral trail: who brought this player in, their own code, and how
        // many players they have referred.
        ['Referral Code', d.referral_code || '—'],
        [
          'Referred By',
          d.referred_by
            ? `${d.referred_by_username || 'Unknown'} (#${d.referred_by})`
            : '—',
        ],
        ['Players Referred', d.referred_count ?? 0],
      ],
    },
  ];
}

export default function PlayerProfileModal({
  open,
  detail,
  loading,
  onClose,
  onEdit,
  onResetPassword,
  onDuplicateAccounts,
  onKickOut,
  onFreeze,
}) {
  const d = detail || {};
  const [selectedBet, setSelectedBet] = useState(null);

  return (
    <Modal open={open} onClose={onClose} title="User Details" size="xl">
      {loading || !d.username ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-800/60" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* ---------------- User Details ---------------- */}
          <Panel title="User Details">
            {/* Three themed columns of near-equal height. Defining them as data
                rather than three hand-written blocks keeps the panel balanced when
                fields are added or removed — the previous hardcoded split drifted
                to 6/10/7 rows once a few fields were dropped. */}
            <div className="grid gap-x-8 md:grid-cols-3">
              {detailColumns(d).map((column) => (
                <div key={column.key}>
                  {column.rows.map(([label, value]) => (
                    <DetailRow key={label} label={label} value={value} />
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button onClick={() => onEdit?.(d)}>Edit User</Button>
              <Button onClick={() => onResetPassword?.(d)}>Reset Password</Button>
              <Button onClick={() => onDuplicateAccounts?.(d)}>Duplicate Accounts</Button>
              <Button onClick={() => onKickOut?.(d)}>Kick Out</Button>
              <Button onClick={() => onFreeze?.(d)}>
                {d.account_status === 'suspended' ? 'Unfreeze Account' : 'Freeze Account'}
              </Button>
            </div>
          </Panel>

          {/* ---------------- Game statistics ---------------- */}
          <PanelTable
            title="Game Statistics Since Forever (Real Money)"
            rows={d.game_stats_real}
            noun="game"
            columns={[
              {
                label: 'Game Id',
                render: (r) => (
                  <span className="font-mono text-xs">{dash(r.game_id)}</span>
                ),
              },
              { label: 'Provider', render: (r) => dash(r.provider ?? r.game_name) },
              { label: 'Plays', render: (r) => r.plays },
              { label: 'Bet', render: (r) => inr(r.bet) },
              { label: 'Amount', render: (r) => inr(r.amount) },
              {
                label: 'Result',
                render: (r) => {
                  const value = Number(r.result ?? 0);
                  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
                  return (
                    <span
                      className={
                        value > 0
                          ? 'text-emerald-400'
                          : value < 0
                            ? 'text-rose-400'
                            : undefined
                      }
                    >
                      {sign}
                      {inr(Math.abs(value))}
                    </span>
                  );
                },
              },
            ]}
          />

          {/* ---------------- Bonuses ---------------- */}
          <PanelTable
            title="Recevied Bonuses"
            rows={d.received_bonuses}
            noun="bonus"
            columns={[
              { label: 'ID', render: (r) => r.id },
              { label: 'Requested', render: (r) => fmtDate(r.requested_at) },
              { label: 'Expried', render: (r) => fmtDate(r.expires_at) },
              { label: 'Bonus Code', render: (r) => dash(r.bonus_code) },
              { label: 'Bonus', render: (r) => dash(r.bonus_name) },
              { label: 'Amount', render: (r) => inr(r.amount) },
              { label: 'Auto Reddem', render: (r) => yesNo(r.auto_redeem) },
              { label: 'State', render: (r) => <StatusBadge status={r.state} /> },
              { label: 'Comments', render: (r) => dash(r.comments) },
            ]}
          />

          {/* ---------------- Cashier ---------------- */}
          <PanelTable
            title="Deposits"
            rows={d.deposits}
            noun="deposit"
            columns={[
              { label: 'ID', render: (r) => r.id },
              { label: 'Type', render: (r) => txTypeLabel(r.type) },
              { label: 'Modified', render: (r) => fmtDate(r.updated_at) },
              { label: 'Created', render: (r) => fmtDate(r.created_at) },
              { label: 'Web', render: (r) => dash(d.country_code) },
              { label: 'Payment Method(ID)', render: (r) => dash(r.payment_method) },
              { label: 'Country', render: () => dash(d.country_code) },
              { label: 'Amount', render: (r) => inr(r.amount) },
              { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />

          <PanelTable
            title="Withdraws"
            rows={d.withdrawals}
            noun="withdrawal"
            columns={[
              { label: 'ID', render: (r) => r.id },
              { label: 'Type', render: (r) => txTypeLabel(r.type) },
              { label: 'Created', render: (r) => fmtDate(r.created_at) },
              { label: 'Modified', render: (r) => fmtDate(r.updated_at) },
              { label: 'Web', render: () => dash(d.country_code) },
              {
                label: 'Method',
                render: (r) => dash(r.payment_method ?? r.provider_name),
              },
              { label: 'Amount', render: (r) => inr(r.amount) },
              { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />

          <PanelTable
            title="Player Transaction History"
            rows={d.transaction_history}
            noun="transaction"
            columns={[
              { label: 'ID', render: (r) => r.id },
              {
                label: 'Round Id',
                // reference_number for bet settlements — opens the same
                // transaction detail modal used on Bet History / Transactions.
                render: (r) => <TxReference reference={r.round_id} />,
              },
              { label: 'Provider', render: (r) => dash(r.provider) },
              { label: 'Game Name', render: (r) => dash(r.game_name) },
              { label: 'Date', render: (r) => fmtDate(r.created_at) },
              { label: 'Description', render: (r) => dash(r.description) },
              {
                label: 'Type',
                render: (r) => (
                  <span className="capitalize">
                    {String(r.type || '').replace(/_/g, ' ')}
                  </span>
                ),
              },
              { label: 'Amount', render: (r) => inr(r.amount) },
              {
                label: 'Total Amount',
                // Wallet balance available after this credit/debit — not the
                // movement size (Amount).
                render: (r) =>
                  r.wallet_balance == null ? '—' : inr(r.wallet_balance),
              },
              { label: 'Sports Bonus Amount', render: () => inr(0) },
              { label: 'Casino Bonus Amount', render: () => inr(0) },
              { label: 'Sports Type', render: () => '—' },
              { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />

          {/* ---------------- Sportsbook ---------------- */}
          <PanelTable
            title="Player Bet History (Sports)"
            rows={d.sport_bets}
            noun="bet"
            columns={[
              {
                label: 'ID',
                // Opens the selection, result and P/L behind this stake — see
                // SportBetDetailModal above.
                render: (r) => (
                  <button
                    type="button"
                    onClick={() => setSelectedBet(r)}
                    title="View bet detail"
                    className="inline-flex max-w-[180px] items-center gap-1 truncate font-mono text-xs text-indigo-300 transition hover:text-indigo-200 hover:underline"
                  >
                    <Receipt className="h-3 w-3 shrink-0" />
                    <span className="truncate">{dash(r.id)}</span>
                  </button>
                ),
              },
              { label: 'Sports Type', render: (r) => dash(r.sport) },
              { label: 'Home Name', render: (r) => dash(r.home) },
              { label: 'Away Name', render: (r) => dash(r.away) },
              { label: 'League Name', render: (r) => dash(r.league) },
              { label: 'Odds', render: (r) => dash(r.odds) },
              {
                label: 'Match ID',
                render: (r) => (
                  <span className="font-mono text-xs">{dash(r.event_key)}</span>
                ),
              },
              { label: 'Bet Amount', render: (r) => inr(r.stake) },
              {
                label: 'Status',
                // The bet's own outcome (pending until the match settles), not
                // the callback log's "settled", which only means the stake was
                // taken.
                render: (r) => <StatusBadge status={r.status} />,
              },
              {
                label: 'Remark',
                // What each aggregator callback did to the wallet, e.g.
                // "bet=100.0 win=0 bal=997.20" — stake first, then payout.
                render: (r) => (
                  <span className="font-mono text-xs">{dash(r.remark)}</span>
                ),
              },
            ]}
          />

          <SportBetDetailModal bet={selectedBet} onClose={() => setSelectedBet(null)} />
        </div>
      )}
    </Modal>
  );
}
