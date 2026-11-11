'use client';

/* Product data console. Every table the product has, with full read and write
   access over the signed webhook: browse, search, sort and filter any table,
   open any record to edit it, create and delete records, and run the money and
   workflow actions (adjust a balance, approve a withdrawal, …) that go through
   the product's own services. Super Admin does not sign into the product's
   panels; everything happens here. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle, ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, Coins, Database,
  Filter, HandCoins, Loader2, Lock, Network, Plus, RefreshCw, Search, ShieldCheck,
  TrendingDown, Wallet2, X,
} from 'lucide-react';
import {
  deleteProductRecord, getProductWebhookDataset, getProductWebhookDeliveries,
  getProductWebhookSummary, updateProductRecord,
} from '@/services/api';
import { useTheme } from '../../../providers';
import DashboardLayout from '../../../components/DashboardLayout';
import DataTable from './_components/DataTable';
import DatasetNav from './_components/DatasetNav';
import RecordDrawer, { RowPreview } from './_components/RecordDrawer';
import WebhookActivity from './_components/WebhookActivity';
import {
  BUTTON, confirmTyped, datasetIcon, formatCount, humanize, swalThemed, toast,
} from './_components/ui';

const PAGE_SIZES = [25, 50, 100, 200];

const ACCENTS = {
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
};

/* Headline aggregate cards (player balances, then partner money). */
function SummaryCards({ aggregates }) {
  const money = (n) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n ?? 0);
  const players = [
    { label: 'Main', value: money(aggregates.total_main_balance), icon: Wallet2, accent: 'emerald' },
    { label: 'Bonus', value: money(aggregates.total_bonus_balance), icon: Coins, accent: 'amber' },
    { label: 'Locked', value: money(aggregates.total_locked_balance), icon: Lock, accent: 'indigo' },
  ];
  // Products that predate the partner datasets don't send these keys.
  const hasPartners = 'total_agent_balance' in aggregates;
  const partners = [
    { label: 'Agent Credit', value: money(aggregates.total_agent_balance), icon: Network, accent: 'sky' },
    { label: 'Exposure', value: money(aggregates.total_agent_exposure), icon: TrendingDown, accent: 'rose' },
    { label: 'Aff. Pending', value: money(aggregates.total_affiliate_pending_commission), icon: HandCoins, accent: 'amber' },
    { label: 'Aff. Paid', value: money(aggregates.total_affiliate_paid_commission), icon: BadgeCheck, accent: 'emerald' },
  ];
  const cards = hasPartners ? [...players, ...partners] : players;
  return (
    <div className={`grid grid-cols-2 gap-2 ${hasPartners ? 'sm:grid-cols-4 lg:grid-cols-7' : 'sm:grid-cols-3'}`}>
      {cards.map((c) => (
        <div key={c.label} className="flex min-w-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${ACCENTS[c.accent]}`}>
            <c.icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));

function DataExplorer() {
  const { id } = useParams();
  const { theme } = useTheme();
  const swal = useCallback((opts) => swalThemed(opts, theme), [theme]);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Everything that decides which rows are on screen, changed together so a
  // switch of table, page or filter costs exactly one request.
  const [query, setQuery] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterLabels, setFilterLabels] = useState({});
  const [table, setTable] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState(null);
  const [toggling, setToggling] = useState(null);

  // Open records, newest on top: following an id from one record to another
  // stacks them so Back returns to where you came from.
  const [drawer, setDrawer] = useState([]);
  const [preview, setPreview] = useState(null);

  const [deliveries, setDeliveries] = useState([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const showActivityRef = useRef(false);
  showActivityRef.current = showActivity;

  // A product whose API predates the console serves rows but no edits.
  const writable = !!summary?.writable;

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

  const loadSummary = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setSummaryLoading(true);
    try {
      const data = await getProductWebhookSummary(id);
      setSummary(data);
      setQuery((q) => q || {
        dataset: data.datasets?.[0]?.key || null, page: 1, pageSize: 50,
        q: '', sort: null, dir: 'desc', filters: {},
      });
    } catch (e) {
      if (!silent) swal({ icon: 'error', title: 'Failed to load product data', text: e.message });
    } finally {
      if (!silent) setSummaryLoading(false);
    }
  }, [id, swal]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const requestRef = useRef(0);
  const loadTable = useCallback(async ({ silent = false } = {}) => {
    if (!query?.dataset) return;
    const n = ++requestRef.current;
    if (!silent) {
      setTableLoading(true);
      setTableError(null);
    }
    try {
      const data = await getProductWebhookDataset(id, query.dataset, {
        page: query.page, pageSize: query.pageSize, q: query.q,
        sort: query.sort, dir: query.dir, filters: query.filters,
      });
      if (n !== requestRef.current) return;
      setTable(data);
      setTableError(null);
    } catch (e) {
      if (n !== requestRef.current) return;
      if (!silent) setTable(null);
      setTableError(e.message);
    } finally {
      if (n === requestRef.current) setTableLoading(false);
      if (showActivityRef.current) loadDeliveries();
    }
  }, [id, query, loadDeliveries]);

  useEffect(() => { loadTable(); }, [loadTable]);

  // Debounced search: one request once typing pauses.
  useEffect(() => {
    const t = setTimeout(() => {
      const term = searchText.trim();
      setQuery((q) => (q && q.q !== term ? { ...q, q: term, page: 1 } : q));
    }, 350);
    return () => clearTimeout(t);
  }, [searchText]);

  const datasets = useMemo(() => summary?.datasets || [], [summary]);
  const datasetLabel = useCallback(
    (key) => datasets.find((d) => d.key === key)?.label || humanize(key),
    [datasets],
  );
  const activeMeta = datasets.find((d) => d.key === query?.dataset);
  const current = table && table.dataset === query?.dataset ? table : null;
  const readOnly = !!(current?.read_only ?? activeMeta?.read_only);
  const editable = writable && !readOnly;

  const selectDataset = useCallback((key, filters = {}, labels = {}) => {
    setSearchText('');
    setFilterLabels(labels);
    setTable((t) => (t && t.dataset === key ? t : null));
    setQuery((q) => ({
      dataset: key, page: 1, pageSize: q?.pageSize || 50,
      q: '', sort: null, dir: 'desc', filters,
    }));
  }, []);

  const removeFilter = (field) => {
    setFilterLabels(({ [field]: _gone, ...rest }) => rest);
    setQuery((q) => {
      const { [field]: _removed, ...filters } = q.filters;
      return { ...q, filters, page: 1 };
    });
  };

  const onSort = (col) => setQuery((q) => {
    if (q.sort !== col) return { ...q, sort: col, dir: 'desc', page: 1 };
    if (q.dir === 'desc') return { ...q, dir: 'asc', page: 1 };
    return { ...q, sort: null, dir: 'desc', page: 1 };
  });

  /* After any write: re-read the page (and the counts, if rows came or went). */
  const refreshAfterChange = useCallback(({ created = false, deleted = false } = {}) => {
    loadTable({ silent: true });
    if (created || deleted) loadSummary({ silent: true });
    if (showActivityRef.current) loadDeliveries();
  }, [loadTable, loadSummary, loadDeliveries]);

  const toggleBool = async (row, col) => {
    setToggling(`${row.id}:${col}`);
    try {
      const res = await updateProductRecord(id, query.dataset, row.id, { [col]: !row[col] });
      setTable((t) => (t && t.dataset === res.dataset
        ? { ...t, rows: t.rows.map((r) => (r.id === row.id ? { ...r, ...pick(res.record, t.columns) } : r)) }
        : t));
      toast(theme, `${humanize(col)} set to ${row[col] ? 'No' : 'Yes'} on #${row.id}`);
    } catch (e) {
      swal({ icon: 'error', title: 'Could not update', text: e.message });
    } finally {
      setToggling(null);
    }
  };

  const deleteRow = async (row) => {
    const label = datasetLabel(query.dataset);
    const ok = await confirmTyped(theme, {
      title: `Delete ${label} #${row.id}?`,
      html: "This permanently removes the record from the product's database, along with "
        + "the rows that belong to it under the product's own rules.",
    });
    if (!ok) return;
    try {
      await deleteProductRecord(id, query.dataset, row.id);
      toast(theme, `${label} #${row.id} deleted`);
      refreshAfterChange({ deleted: true });
    } catch (e) {
      swal({ icon: 'error', title: 'Could not delete', text: e.message });
    }
  };

  const openRow = (row) => {
    if (!writable) {
      setPreview(row);
      return;
    }
    setDrawer([{ dataset: query.dataset, id: row.id }]);
  };
  const openRef = (dataset, rid) => setDrawer([{ dataset, id: rid }]);
  const pushRef = (dataset, rid) => setDrawer((s) => [...s, { dataset, id: rid }]);
  const showRelated = (dataset, field, value, title) => {
    setDrawer([]);
    selectDataset(dataset, { [field]: value }, title ? { [field]: title } : {});
  };
  const top = drawer[drawer.length - 1];

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

  const ActiveIcon = datasetIcon(query?.dataset, activeMeta?.group);
  const filterEntries = Object.entries(query?.filters || {});

  return (
    <>
      {top && (
        <RecordDrawer
          key={`${top.dataset}:${top.id ?? 'new'}:${drawer.length}`}
          productId={id}
          target={top}
          createFields={top.create ? current?.fields : undefined}
          datasetLabel={datasetLabel}
          depth={drawer.length}
          onBack={() => setDrawer((s) => s.slice(0, -1))}
          onClose={() => setDrawer([])}
          onOpenRef={pushRef}
          onShowRelated={showRelated}
          onChanged={refreshAfterChange}
          onCreated={(newId) => setDrawer((s) => [...s.slice(0, -1), { dataset: top.dataset, id: newId }])}
        />
      )}
      {preview && (
        <RowPreview row={preview} label={datasetLabel(query.dataset)} onClose={() => setPreview(null)} />
      )}

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
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>ID #{summary.id}</span>
                <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase ${summary.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {summary.status}
                </span>
                <span>{datasets.length} tables</span>
                {writable && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                    <ShieldCheck className="h-3 w-3" /> Full control
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { loadSummary({ silent: true }); loadTable(); loadDeliveries(); }}
            className={BUTTON.ghost}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* Aggregates */}
        <SummaryCards aggregates={summary.aggregates || {}} />

        {writable ? (
          <p className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 text-xs text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Every table of this product, with full read and write access. Click any row to open it: edit any field,
            run its actions, or delete it. Changes apply to the live database immediately and every request is
            recorded under Webhook Activity.
          </p>
        ) : (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This product&apos;s API predates the data console, so its data is read-only here. Deploy the latest
            product API to edit records, run actions and see every table.
          </p>
        )}

        {/* Console: table navigator + the open table */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white lg:flex-row dark:border-gray-700 dark:bg-gray-800">
          <DatasetNav
            groups={summary.groups}
            datasets={datasets}
            active={query?.dataset}
            onSelect={(key) => selectDataset(key)}
          />

          <div className="min-w-0 flex-1">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              <div className="flex min-w-0 items-center gap-2">
                <ActiveIcon className="h-4 w-4 shrink-0 text-gray-400" />
                <h2 className="truncate font-display text-sm font-bold text-gray-900 dark:text-white">
                  {activeMeta?.label || humanize(query?.dataset || '')}
                </h2>
                {current && (
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {formatCount(current.total)}
                  </span>
                )}
                {readOnly && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                    <Lock className="h-3 w-3" /> Audit trail · read-only
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search text, or an id…"
                    className="w-56 rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
                  />
                </div>
                {editable && current?.fields && (
                  <button type="button" onClick={() => setDrawer([{ dataset: query.dataset, create: true }])} className={BUTTON.primary}>
                    <Plus className="h-3.5 w-3.5" /> New record
                  </button>
                )}
              </div>
            </div>

            {/* Active filters (set by following a record's related rows) */}
            {filterEntries.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-700">
                <Filter className="h-3.5 w-3.5 text-gray-400" />
                {filterEntries.map(([field, value]) => (
                  <span key={field} className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 py-0.5 pl-2.5 pr-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
                    {humanize(field)} = {value === null ? 'empty' : `#${value}`}
                    {filterLabels[field] && <span className="font-normal text-indigo-500 dark:text-indigo-400">({filterLabels[field]})</span>}
                    <button type="button" onClick={() => removeFilter(field)} title="Remove filter" className="rounded-full p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Table */}
            {tableLoading && !current ? (
              <div className="flex items-center gap-2 p-8 text-gray-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading {activeMeta?.label}…</div>
            ) : tableError && !current ? (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">{tableError}</p>
                <button type="button" onClick={() => loadTable()} className={BUTTON.ghost}>Try again</button>
              </div>
            ) : current ? (
              <div className={`relative ${tableLoading ? 'opacity-60' : ''}`}>
                {tableLoading && <Loader2 className="absolute right-4 top-3 h-4 w-4 animate-spin text-indigo-500" />}
                <DataTable
                  columns={current.columns || []}
                  fields={current.fields}
                  rows={current.rows || []}
                  refLabels={current.ref_labels}
                  sort={query.sort}
                  dir={query.dir}
                  onSort={writable ? onSort : undefined}
                  onOpenRow={openRow}
                  onOpenRef={writable ? openRef : undefined}
                  onToggle={writable ? toggleBool : undefined}
                  toggling={toggling}
                  onDelete={deleteRow}
                  editable={editable}
                  emptyText={query.q || filterEntries.length ? 'No matching records.' : 'No records in this table.'}
                />
              </div>
            ) : null}

            {/* Pagination */}
            {current && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-700">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>Page {current.page} of {current.total_pages} · {formatCount(current.total)} records</span>
                  <select
                    value={query.pageSize}
                    onChange={(e) => setQuery((q) => ({ ...q, pageSize: Number(e.target.value), page: 1 }))}
                    className="rounded-md border border-gray-200 bg-transparent px-1.5 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300"
                  >
                    {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
                  </select>
                </div>
                {current.total_pages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuery((q) => ({ ...q, page: Math.max(1, q.page - 1) }))}
                      disabled={query.page <= 1 || tableLoading}
                      className={BUTTON.ghost}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuery((q) => ({ ...q, page: Math.min(current.total_pages, q.page + 1) }))}
                      disabled={query.page >= current.total_pages || tableLoading}
                      className={BUTTON.ghost}
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Signed-webhook request audit trail (the webhook_deliveries table) */}
        <WebhookActivity
          deliveries={deliveries}
          loading={deliveriesLoading}
          open={showActivity}
          onToggle={() => {
            if (!showActivity) loadDeliveries();
            setShowActivity((v) => !v);
          }}
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
