'use client';

// Reports — the single export surface for the whole platform.
//
// Four tabs, in the order an operator reaches for them:
//   Reports    the curated exports (players, money, play, bonuses) — dollara's
//              original single-tab report screen, unchanged
//   Backoffice the reference reports, each opened or downloaded in place
//   Raw Tables every database table, foreign keys resolved to readable columns
//   Combined   pre-joined cross-table sets, and the whole-database download
//
// Everything here streams from the API with the admin token attached, so a
// download is a fetch + blob rather than a plain link (a link cannot carry the
// Authorization header).

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Database, Download, FileSpreadsheet, Layers, Loader2, Search, Table2,
} from 'lucide-react';
import { API_URL, } from '@/services/tenant';
import { getAdminToken } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Card,
  Field,
  Input,
  toast,
  useAdminData,
} from '@/components/admin/AdminShell';

const DESCRIPTIONS = {
  users: 'Every registered player with balances, KYC and activity dates.',
  transactions: 'All money movements — deposits, withdrawals, bonuses, settlements.',
  deposits: 'Deposit transactions only, with method and reference.',
  withdrawals: 'Withdrawal requests with their approval status.',
  'bet-history': 'Play sessions per player: stakes, payouts and result.',
  rounds: 'Individual game rounds, including unsettled ones.',
  bonuses: 'Issued bonuses with wagering progress.',
};

// The reference backoffice reports, grouped as they were on the old Backoffice
// Reports page. Each still has its own screen; from here it can also be
// downloaded directly without opening it first.
const BO_GROUPS = [
  {
    title: 'Finances',
    items: [
      ['deposits', 'Player Deposits'], ['withdrawals', 'Player Withdrawals'],
      ['bonuses', 'Player Bonuses'], ['refunds', 'Refunds Adjustments'],
      ['chargebacks', 'Charge Back Adjustments'],
      ['withdrawal-adjustments', 'Withdrawal Adjustments'],
      ['other-adjustments', 'Other Adjustments'], ['gross-profit', 'Gross Profit'],
      ['jackpot-contribution', 'Jackpot Contribution'],
      ['providers-expense', 'Providers Expense'], ['net-profit', 'Net Profit'],
      ['payment-methods', 'Payment Methods'],
    ],
  },
  {
    title: 'Management Reports',
    items: [
      ['attrition', 'Atterition Report'], ['real-revenue', 'Real Revenue'],
      ['free-money-analysis', 'Free Money Analysis Report'],
      ['active-players', 'Active Players Report'], ['aging', 'Aging Report'],
      ['monthly-da', 'Month Wise DA Report'], ['daily-da', 'Day Wise DA Report'],
      ['bonus-analysis', 'Bonus Analysis Report'], ['player-wise', 'Player Wise Report'],
    ],
  },
  {
    title: 'Downloadable Reports',
    items: [
      ['players-data', 'Players Data'], ['banned-players', 'Fraud/Banned Players Data'],
      ['deposits-data', 'Deposits Data'], ['bonus-data', 'Player Bonus Data'],
      ['transaction-history', 'Transaction History'], ['sports', 'Sports Report'],
    ],
  },
  {
    title: 'Players & Countries',
    items: [
      ['signups', 'Signups'], ['gender', 'Gender'],
      ['countries-signups', 'Countries Signups'],
      ['countries-profit', 'Countries Gross Profit'],
      ['players-campaign', 'Players Campaign'],
    ],
  },
  {
    title: 'Games, Bets & Audit',
    items: [
      ['profitability', 'Games Profitability'], ['bets-done', 'Bets Done'],
      ['log-history', 'Log History Report'], ['one-page', 'One Page Report'],
    ],
  },
];

// A quick range preset -> [from, to] as ISO dates.
function preset(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)];
}

const TABS = [
  { key: 'reports', label: 'Reports', icon: FileSpreadsheet },
  { key: 'backoffice', label: 'Backoffice', icon: Layers },
  { key: 'tables', label: 'Raw Tables', icon: Table2 },
  { key: 'combined', label: 'Combined & Full DB', icon: Database },
];

export default function AdminReportsPage() {
  const { data: kinds, loading } = useAdminData('/api/v1/admin/reports');
  const { data: catalog, loading: catalogLoading } = useAdminData('/api/v1/admin/data/catalog');
  const [tab, setTab] = useState('reports');
  const [range, setRange] = useState({ from: '', to: '' });
  const [memberId, setMemberId] = useState('');
  const [busy, setBusy] = useState(null);
  const [tableSearch, setTableSearch] = useState('');

  // Dollara's original curated-exports download — unchanged: fetched with the
  // admin token, then handed to the browser as a blob, since a plain link
  // could not carry the Authorization header.
  const download = async (kind) => {
    setBusy(kind);
    try {
      const params = new URLSearchParams();
      if (range.from) params.set('from', range.from);
      if (range.to) params.set('to', range.to);
      const trimmedMemberId = memberId.trim();
      if (trimmedMemberId) params.set('memberId', trimmedMemberId);

      const res = await fetch(
        `${API_URL}/api/v1/admin/reports/${kind}/export?${params}`,
        { headers: { Authorization: `Bearer ${getAdminToken()}` } },
      );
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const stampVal = new Date().toISOString().slice(0, 10);
      link.download = trimmedMemberId
        ? `${kind}-${trimmedMemberId}-${stampVal}.csv`
        : `${kind}-${stampVal}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  // --- Backoffice / Raw Tables / Combined & Full DB — new tabs, ported from
  // the Backoffice Parity build. Kept on a separate busy state (`busy2`) so
  // they never interfere with the curated-exports tab above.
  const [busy2, setBusy2] = useState(null);

  const grab = async (id, url, filename) => {
    setBusy2(id);
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      toast.success('Download started');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy2(null);
    }
  };

  // Date + time to the second, UTC, matching the stamp the API puts on the
  // file it serves — this download attribute overrides that filename, so the
  // two formats have to agree or the precision is lost on the way through.
  const stamp = () => new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');

  const downloadBo = (slug) => {
    const params = new URLSearchParams();
    if (range.from) params.set('dateFrom', range.from);
    if (range.to) params.set('dateTo', range.to);
    return grab(
      `bo:${slug}`,
      `${API_URL}/api/v1/admin/bo/reports/${slug}/export?${params}`,
      `${slug}-${stamp()}.xlsx`,
    );
  };

  const downloadTable = (key, format) => grab(
    `table:${key}:${format}`,
    `${API_URL}/api/v1/admin/data/table/${key}/export?format=${format}`,
    `${key}-${stamp()}.${format}`,
  );

  const downloadCombo = (key, format) => grab(
    `combo:${key}:${format}`,
    `${API_URL}/api/v1/admin/data/combo/${key}/export?format=${format}`,
    `${key}-${stamp()}.${format}`,
  );

  const downloadEverything = (format) => grab(
    `full:${format}`,
    `${API_URL}/api/v1/admin/data/full-export?format=${format}`,
    `database-${stamp()}.${format === 'xlsx' ? 'xlsx' : 'zip'}`,
  );

  const tables = catalog?.tables ?? [];
  const combos = catalog?.combos ?? [];
  const visibleTables = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter(
      (t) => t.label.toLowerCase().includes(q)
        || t.key.toLowerCase().includes(q)
        || t.table.toLowerCase().includes(q),
    );
  }, [tables, tableSearch]);

  const totalRows = useMemo(
    () => tables.reduce((sum, t) => sum + (t.rows ?? 0), 0),
    [tables],
  );

  const rangeHint = range.from || range.to
    ? `Exporting ${range.from || 'the beginning'} → ${range.to || 'today'}`
    : 'No range set — exports cover all time';
  const memberHint = memberId.trim()
    ? ` · filtered to member ID ${memberId.trim()}`
    : '';

  return (
    <AdminShell
      title="Reports"
      subtitle="Every report and the complete database, downloadable as CSV or Excel"
    >
      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
              tab === key
                ? 'bg-indigo-500/15 text-white ring-1 ring-inset ring-indigo-500/40'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Date / member filters apply to the two report-style tabs. */}
      {(tab === 'reports' || tab === 'backoffice') && (
        <Card className="mb-5 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Filters
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {tab === 'reports' && (
              <Field label="Member ID">
                <Input
                  placeholder="e.g. 10000001"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                />
              </Field>
            )}
            <Field label="From">
              <Input
                type="date"
                value={range.from}
                onChange={(e) => setRange({ ...range, from: e.target.value })}
              />
            </Field>
            <Field label="To">
              <Input
                type="date"
                value={range.to}
                onChange={(e) => setRange({ ...range, to: e.target.value })}
              />
            </Field>
            <div className="flex flex-wrap items-end gap-2 lg:col-span-2">
              {[
                ['Last 7 days', 7],
                ['Last 30 days', 30],
                ['Last 90 days', 90],
              ].map(([label, days]) => (
                <Button
                  key={label}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const [from, to] = preset(days);
                    setRange({ from, to });
                  }}
                >
                  {label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRange({ from: '', to: '' })}
              >
                All time
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {rangeHint}{tab === 'reports' ? memberHint : ''}.
          </p>
        </Card>
      )}

      {/* ---------------------------- Curated reports (dollara original) -------- */}
      {tab === 'reports' && (
        loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-900" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(kinds ?? []).map((k) => (
              <Card key={k.kind} className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
                    <FileSpreadsheet className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white">{k.label}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {DESCRIPTIONS[k.kind] ?? 'CSV export'}
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-4 w-full"
                  variant="secondary"
                  disabled={busy === k.kind}
                  onClick={() => download(k.kind)}
                  icon={busy === k.kind ? undefined : Download}
                >
                  {busy === k.kind ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Preparing…
                    </>
                  ) : (
                    'Download CSV'
                  )}
                </Button>
              </Card>
            ))}
          </div>
        )
      )}

      {/* -------------------------- Backoffice reports -------------------------- */}
      {tab === 'backoffice' && (
        <div className="grid gap-5 lg:grid-cols-2">
          {BO_GROUPS.map((g) => (
            <Card key={g.title} className="overflow-hidden">
              <div className="border-b border-slate-800 px-5 py-4">
                <h2 className="font-display text-sm font-bold text-white">{g.title}</h2>
              </div>
              <ul>
                {g.items.map(([slug, label]) => (
                  <li key={slug} className="border-b border-slate-800/60 last:border-0">
                    <div className="flex items-center justify-between gap-3 px-5 py-2.5">
                      <Link
                        href={`/bo-reports/${slug}`}
                        className="flex min-w-0 items-center gap-2.5 text-sm text-slate-300 transition hover:text-white"
                      >
                        <FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="truncate">{label}</span>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy2 === `bo:${slug}`}
                        onClick={() => downloadBo(slug)}
                        icon={busy2 === `bo:${slug}` ? undefined : Download}
                      >
                        {busy2 === `bo:${slug}`
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : 'Excel'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {/* ------------------------------ Raw tables ------------------------------ */}
      {tab === 'tables' && (
        <>
          <Card className="mb-5 p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white">
                  Every database table
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {catalogLoading
                    ? 'Reading the catalogue…'
                    : `${tables.length} tables · ${totalRows.toLocaleString()} rows in total. Foreign keys are resolved to readable columns, and passwords, tokens and secrets are never exported.`}
                </p>
              </div>
              <Field label="Find a table" className="w-full sm:w-72">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    className="pl-9"
                    placeholder="users, transactions, bonus…"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                  />
                </div>
              </Field>
            </div>
          </Card>

          {catalogLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-900" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleTables.map((t) => (
                <Card key={t.key} className="flex flex-col p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-800 text-slate-400">
                      <Table2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-white">
                        {t.label}
                      </h3>
                      <p className="mt-0.5 truncate font-mono text-[0.7rem] text-slate-500">
                        {t.table}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t.rows.toLocaleString()} rows · {t.columns} columns
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      disabled={busy2 === `table:${t.key}:csv`}
                      onClick={() => downloadTable(t.key, 'csv')}
                    >
                      {busy2 === `table:${t.key}:csv`
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : 'CSV'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      disabled={busy2 === `table:${t.key}:xlsx`}
                      onClick={() => downloadTable(t.key, 'xlsx')}
                    >
                      {busy2 === `table:${t.key}:xlsx`
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : 'Excel'}
                    </Button>
                  </div>
                </Card>
              ))}
              {visibleTables.length === 0 && (
                <Card className="p-8 text-center text-sm text-slate-500 sm:col-span-2 lg:col-span-3">
                  No table matches “{tableSearch}”.
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* -------------------------- Combined + full dump ------------------------ */}
      {tab === 'combined' && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
                  <Database className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold text-white">The entire database</h2>
                  <p className="mt-1 max-w-xl text-xs text-slate-500">
                    Every table in one download — a ZIP holding one CSV per table,
                    or a single Excel workbook with one sheet per table. Large
                    databases take a moment to build.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={busy2 === 'full:zip'}
                  onClick={() => downloadEverything('zip')}
                  icon={busy2 === 'full:zip' ? undefined : Download}
                >
                  {busy2 === 'full:zip'
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Building…</>
                    : 'Download ZIP'}
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy2 === 'full:xlsx'}
                  onClick={() => downloadEverything('xlsx')}
                  icon={busy2 === 'full:xlsx' ? undefined : Download}
                >
                  {busy2 === 'full:xlsx'
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Building…</>
                    : 'Download Excel'}
                </Button>
              </div>
            </div>
          </Card>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Pre-joined combinations
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {combos.map((c) => (
                <Card key={c.key} className="flex flex-col p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-800 text-slate-400">
                      <Layers className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white">{c.label}</h3>
                      <p className="mt-1 text-xs text-slate-500">{c.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      disabled={busy2 === `combo:${c.key}:csv`}
                      onClick={() => downloadCombo(c.key, 'csv')}
                    >
                      {busy2 === `combo:${c.key}:csv`
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : 'CSV'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      disabled={busy2 === `combo:${c.key}:xlsx`}
                      onClick={() => downloadCombo(c.key, 'xlsx')}
                    >
                      {busy2 === `combo:${c.key}:xlsx`
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : 'Excel'}
                    </Button>
                  </div>
                </Card>
              ))}
              {!catalogLoading && combos.length === 0 && (
                <Card className="p-8 text-center text-sm text-slate-500 sm:col-span-2">
                  No combinations available.
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
