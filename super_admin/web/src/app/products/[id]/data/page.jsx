'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Swal from 'sweetalert2';
import {
  ArrowLeft, Box, Loader2, Search, Database, Users, Wallet, ArrowLeftRight,
  Dice5, Gamepad2, Boxes, Gift, PhoneCall, Settings2, ChevronLeft,
  ChevronRight, Eye, X, RefreshCw, Wallet2, Coins, Lock, Power, PowerOff,
  Activity, CheckCircle2, XCircle, Clock, ChevronDown,
} from 'lucide-react';
import {
  getProductWebhookSummary, getProductWebhookDataset, getProductWebhookDeliveries,
  updateProductGameActive,
} from '@/services/api';
import { useTheme } from '../../../providers';
import DashboardLayout from '../../../components/DashboardLayout';

function swalThemed(opts, theme) {
  const isDark = theme === 'dark';
  return Swal.fire({
    background: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#f1f5f9' : '#111827',
    confirmButtonColor: '#4f46e5',
    ...opts,
  });
}

/* Icon per dataset key (falls back to a generic box). */
const DATASET_ICONS = {
  users: Users,
  user_settings: Settings2,
  wallets: Wallet,
  transactions: ArrowLeftRight,
  bets: Dice5,
  games: Gamepad2,
  game_providers: Boxes,
  bonuses: Gift,
  ai_call_logs: PhoneCall,
  platform_settings: Settings2,
};

const PAGE_SIZE = 50;

/* Pretty column header from a snake_case key. */
function humanize(col) {
  return col
    .replace(/_/g, ' ')
    .replace(/\bid\b/i, 'ID')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* Format a cell value for table display. */
function formatCell(col, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  const s = String(value);
  // ISO timestamps -> readable
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }
  return s;
}

/* Colored status pill for known status-like columns. */
function StatusPill({ value }) {
  const v = String(value).toLowerCase();
  const map = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    verified: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    suspended: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    blocked: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    lost: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  };
  const cls = map[v] || 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase ${cls}`}>
      {value}
    </span>
  );
}

const STATUS_COLS = new Set(['status', 'account_status', 'kyc_status']);

/* Headline aggregate cards (balances + status breakdowns). */
function SummaryCards({ aggregates }) {
  const money = (n) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n ?? 0);
  const cards = [
    { label: 'Main Balance', value: money(aggregates.total_main_balance), icon: Wallet2, accent: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
    { label: 'Bonus Balance', value: money(aggregates.total_bonus_balance), icon: Coins, accent: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
    { label: 'Locked Balance', value: money(aggregates.total_locked_balance), icon: Lock, accent: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.accent}`}>
              <c.icon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

/* Slide-over showing every field of a single row. */
function RowDetail({ row, label, onClose }) {
  if (!row) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Eye className="h-4 w-4 text-white" />
            </span>
            <div>
              <h2 className="font-display text-sm font-bold text-gray-900 dark:text-white">{label} · #{row.id}</h2>
              <p className="text-xs text-gray-400">Full record</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <dl className="space-y-3">
            {Object.entries(row).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900/60">
                <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-gray-400">{humanize(k)}</dt>
                <dd className="mt-0.5 break-words text-sm font-medium text-gray-900 dark:text-white">
                  {STATUS_COLS.has(k) && v ? <StatusPill value={v} /> : formatCell(k, v)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

/* Relative "time ago" label for the webhook activity log. */
function timeAgo(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const secs = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (secs < 60) return `${Math.floor(secs)}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return d.toLocaleString();
}

const DELIVERY_STATUS = {
  success: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', Icon: CheckCircle2 },
  failed: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', Icon: XCircle },
  pending: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', Icon: Clock },
};

/* Audit trail of signed webhook pulls Super Admin made to this product. Every
   summary/dataset load appends a row here (the webhook_deliveries table). */
function WebhookActivity({ deliveries, loading, open, onToggle, onRefresh }) {
  const failed = deliveries.filter((d) => d.status === 'failed').length;
  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button onClick={onToggle} className="flex items-center gap-2.5 text-left">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Activity className="h-4 w-4" />
          </span>
          <span>
            <span className="flex items-center gap-1.5 font-display text-sm font-bold text-gray-900 dark:text-white">
              Webhook Activity
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </span>
            <span className="text-xs text-gray-400">
              {deliveries.length} recent {deliveries.length === 1 ? 'pull' : 'pulls'}
              {failed > 0 && <span className="ml-1 font-semibold text-red-500">· {failed} failed</span>}
            </span>
          </span>
        </button>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {open && (loading && deliveries.length === 0 ? (
        <div className="flex items-center gap-2 border-t border-gray-100 p-6 text-gray-400 dark:border-gray-700">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading activity…
        </div>
      ) : deliveries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border-t border-gray-100 p-8 text-center dark:border-gray-700">
          <Activity className="h-6 w-6 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400">No webhook pulls recorded yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                <th className="whitespace-nowrap px-4 py-2.5">When</th>
                <th className="whitespace-nowrap px-4 py-2.5">Resource</th>
                <th className="whitespace-nowrap px-4 py-2.5">Status</th>
                <th className="whitespace-nowrap px-4 py-2.5">HTTP</th>
                <th className="whitespace-nowrap px-4 py-2.5">Duration</th>
                <th className="whitespace-nowrap px-4 py-2.5">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {deliveries.map((d) => {
                const s = DELIVERY_STATUS[d.status] || DELIVERY_STATUS.pending;
                return (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-500 dark:text-gray-400" title={d.created_at || ''}>{timeAgo(d.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-200">{d.resource}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase ${s.cls}`}>
                        <s.Icon className="h-3 w-3" /> {d.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-500 dark:text-gray-400">{d.http_status ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-500 dark:text-gray-400">{d.duration_ms != null ? `${d.duration_ms} ms` : '—'}</td>
                    <td className="max-w-[20rem] truncate px-4 py-2.5 text-red-500 dark:text-red-400" title={d.error || ''}>{d.error || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function DataExplorer() {
  const { id } = useParams();
  const { theme } = useTheme();
  const swal = (opts) => swalThemed(opts, theme);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [active, setActive] = useState(null);

  const [table, setTable] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [detailRow, setDetailRow] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const [deliveries, setDeliveries] = useState([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  /* Load the recent signed-webhook pulls (the webhook_deliveries audit trail). */
  const loadDeliveries = useCallback(async () => {
    setDeliveriesLoading(true);
    try {
      const data = await getProductWebhookDeliveries(id, { limit: 50 });
      setDeliveries(data.deliveries || []);
    } catch {
      setDeliveries([]);
    } finally {
      setDeliveriesLoading(false);
    }
  }, [id]);

  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);

  /* Load summary (counts + aggregates) once. */
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await getProductWebhookSummary(id);
      setSummary(data);
      setActive((prev) => prev || data.datasets?.[0]?.key || null);
    } catch (e) {
      swal({ icon: 'error', title: 'Failed to load product data', text: e.message });
    } finally {
      setSummaryLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  /* Debounce the search box. */
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  /* Reset to page 1 when switching dataset or search term. */
  useEffect(() => { setPage(1); }, [active, debounced]);

  /* Load the active dataset's page. */
  const loadTable = useCallback(async () => {
    if (!active) return;
    setTableLoading(true);
    try {
      const data = await getProductWebhookDataset(id, active, { page, pageSize: PAGE_SIZE, q: debounced });
      setTable(data);
    } catch (e) {
      setTable(null);
      swal({ icon: 'error', title: 'Failed to load dataset', text: e.message });
    } finally {
      setTableLoading(false);
      loadDeliveries();  // every pull appends a webhook_deliveries row — keep the log fresh
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, active, page, debounced]);

  useEffect(() => { loadTable(); }, [loadTable]);

  /* Activate/deactivate a game (games dataset only). Writes is_active_web back to
     the product's tenant DB, then patches the row in place. */
  const toggleGameActive = useCallback(async (game) => {
    const next = !game.is_active_web;
    setTogglingId(game.id);
    try {
      const { game: updated } = await updateProductGameActive(id, game.id, next);
      setTable((t) =>
        t ? { ...t, rows: t.rows.map((r) => (r.id === game.id ? { ...r, ...updated } : r)) } : t,
      );
    } catch (e) {
      swal({ icon: 'error', title: 'Could not update game', text: e.message });
    } finally {
      setTogglingId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const activeMeta = useMemo(
    () => summary?.datasets?.find((d) => d.key === active),
    [summary, active],
  );

  if (summaryLoading) {
    return (
      <div className="flex items-center gap-2 p-10 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading product data…
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
          <Database className="h-6 w-6 text-gray-400" />
        </span>
        <p className="text-sm text-gray-400">Could not load this product&apos;s data.</p>
        <Link href="/products" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">← Back to Products</Link>
      </div>
    );
  }

  const columns = table?.columns ?? [];
  const rows = table?.rows ?? [];

  return (
    <>
      <RowDetail row={detailRow} label={activeMeta?.label || ''} onClose={() => setDetailRow(null)} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/products"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              title="Back to Products"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">
                {summary.name} <span className="text-gray-400">· Data</span>
              </h1>
              <p className="mt-0.5 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>ID #{summary.id}</span>
                <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase ${summary.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {summary.status}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => { loadSummary(); loadTable(); loadDeliveries(); }}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* Aggregates */}
        <SummaryCards aggregates={summary.aggregates || {}} />

        {/* Dataset tabs + table */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {/* Tab strip */}
          <div className="flex flex-wrap gap-2 border-b border-gray-100 p-3 dark:border-gray-700">
            {summary.datasets.map((d) => {
              const Icon = DATASET_ICONS[d.key] || Box;
              const isActive = d.key === active;
              return (
                <button
                  key={d.key}
                  onClick={() => setActive(d.key)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {d.label}
                  <span className={`rounded-md px-1.5 py-0.5 text-[0.6rem] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {d.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <h2 className="font-display text-sm font-bold text-gray-900 dark:text-white">
              {activeMeta?.label}
              {table && (
                <span className="ml-2 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {table.total}
                </span>
              )}
            </h2>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-56 rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Table */}
          {tableLoading ? (
            <div className="flex items-center gap-2 p-8 text-gray-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading {activeMeta?.label}…</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
                <Box className="h-6 w-6 text-gray-400" />
              </span>
              <p className="text-sm text-gray-400">{debounced ? 'No matching records.' : 'No records in this dataset.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                    {columns.map((c) => (
                      <th key={c} className="whitespace-nowrap px-4 py-3">{humanize(c)}</th>
                    ))}
                    <th className="px-4 py-3 text-right">{active === 'games' ? 'Actions' : 'View'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.map((row, i) => (
                    <tr key={row.id ?? i} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      {columns.map((c) => (
                        <td key={c} className="max-w-[18rem] truncate whitespace-nowrap px-4 py-3 text-gray-700 dark:text-gray-200" title={formatCell(c, row[c])}>
                          {STATUS_COLS.has(c) && row[c] ? <StatusPill value={row[c]} /> : formatCell(c, row[c])}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {active === 'games' && (
                            <button
                              onClick={() => toggleGameActive(row)}
                              disabled={togglingId === row.id}
                              title={row.is_active_web ? 'Deactivate on product web/app' : 'Activate on product web/app'}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                                row.is_active_web
                                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950'
                                  : 'border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                              }`}
                            >
                              {togglingId === row.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : row.is_active_web ? (
                                <Power className="h-3.5 w-3.5" />
                              ) : (
                                <PowerOff className="h-3.5 w-3.5" />
                              )}
                              {row.is_active_web ? 'Active' : 'Inactive'}
                            </button>
                          )}
                          <button
                            onClick={() => setDetailRow(row)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {table && table.total_pages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-700">
              <p className="text-xs text-gray-400">
                Page {table.page} of {table.total_pages} · {table.total} records
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || tableLoading}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(table.total_pages, p + 1))}
                  disabled={page >= table.total_pages || tableLoading}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Signed-webhook pull audit trail (rows written to the webhook_deliveries table) */}
        <WebhookActivity
          deliveries={deliveries}
          loading={deliveriesLoading}
          open={showActivity}
          onToggle={() => setShowActivity((v) => !v)}
          onRefresh={loadDeliveries}
        />
      </div>
    </>
  );
}

export default function ProductDataPage() {
  return (
    <DashboardLayout>
      <DataExplorer />
    </DashboardLayout>
  );
}
