'use client';

/**
 * Shared building blocks for the reference-parity backoffice screens.
 *
 * Nearly every reference screen is the same shape: a "filter panel" of inputs
 * above a results table, with Search / Cancel. `SearchPage` renders that shape
 * against the existing admin theme, so the pages themselves only declare their
 * own fields and columns.
 *
 * Everything visual here composes the primitives already exported by
 * AdminShell — no new colours, radii or spacing are introduced.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Inbox } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Card,
  DataTable,
  ErrorState,
  Field,
  Input,
  Select,
  inr,
  fmtDate,
} from '@/components/admin/AdminShell';

/* ----------------------------- query helpers ---------------------------- */

/** Drop blank values so an untouched filter never narrows the query. */
export function toQuery(filters = {}, extra = {}) {
  const params = new URLSearchParams();
  Object.entries({ ...filters, ...extra }).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) return;
    params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Fetch a backoffice endpoint whenever `applied` filters or paging change.
 *
 * Responses are guarded by request sequence: a slow earlier request that
 * resolves after a newer one is discarded rather than overwriting fresher
 * rows.
 */
export function useBackofficeData(path, applied, { page = 0, pageSize = 25, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const seq = useRef(0);

  const query = useMemo(
    () => toQuery(applied, { limit: pageSize, offset: page * pageSize }),
    [applied, page, pageSize],
  );

  const load = useCallback(() => {
    if (!enabled) return;
    const ticket = ++seq.current;
    setLoading(true);
    setError(null);
    adminApi(`${path}${query}`)
      .then((res) => {
        if (ticket !== seq.current) return; // a newer request is in flight
        setData(res);
      })
      .catch((e) => {
        if (ticket !== seq.current) return;
        setError(e.message);
      })
      .finally(() => {
        if (ticket === seq.current) setLoading(false);
      });
  }, [path, query, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, setData };
}

/* ------------------------------ filter panel ---------------------------- */

/**
 * The reference "filter panel": a responsive grid of inputs with Search and
 * Cancel. `fields` describes the inputs so a page never repeats the wiring.
 */
export function FilterPanel({ fields, values, onChange, onSearch, onClear, busy, children }) {
  const submit = (e) => {
    e.preventDefault();
    onSearch?.();
  };

  return (
    <Card className="p-5">
      <form onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {fields.map((f) => (
            <Field key={f.name} label={f.label} className={f.span ? 'xl:col-span-2' : ''}>
              {f.type === 'select' ? (
                <Select
                  value={values[f.name] ?? ''}
                  onChange={(e) => onChange(f.name, e.target.value)}
                >
                  {(f.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type={f.type ?? 'text'}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ''}
                  onChange={(e) => onChange(f.name, e.target.value)}
                  {...(f.inputProps ?? {})}
                />
              )}
            </Field>
          ))}
        </div>

        {children}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button type="submit" icon={Search} busy={busy}>
            Search
          </Button>
          <Button type="button" variant="secondary" icon={X} onClick={onClear}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** A date-range pair rendered as one field, as the reference "Period" control. */
export function periodFields(fromName = 'dateFrom', toName = 'dateTo', label = 'Period') {
  return [
    { name: fromName, label: `${label} from`, type: 'date' },
    { name: toName, label: `${label} to`, type: 'date' },
  ];
}

/* ------------------------------ results table --------------------------- */

/**
 * Server-paged results table.
 *
 * DataTable pages client-side over the rows it is given; here the server has
 * already paged, so its own pagination is switched off and the page controls
 * below drive the request instead.
 */
export function ResultTable({
  title,
  columns,
  rows,
  loading,
  error,
  onRetry,
  total = 0,
  page = 0,
  pageSize = 25,
  onPageChange,
  emptyMessage = 'No Records Found',
  emptyHint,
  actions,
  note,
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <Card className="overflow-hidden">
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-display text-sm font-bold text-white">{title}</h2>
            {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
          </div>
          {actions}
        </div>
      )}

      {error ? (
        <div className="p-5">
          <ErrorState message={error} onRetry={onRetry} />
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows ?? []}
            loading={loading}
            paginate={false}
            serialNumber={false}
            emptyMessage={emptyMessage}
            emptyHint={emptyHint}
            emptyIcon={Inbox}
          />

          {/* Server-side pager. Hidden while a single page covers everything. */}
          {total > pageSize && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-3">
              <p className="text-xs text-slate-500">
                Showing {from}–{to} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === 0 || loading}
                  onClick={() => onPageChange?.(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-400">
                  Page {page + 1} of {pages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page + 1 >= pages || loading}
                  onClick={() => onPageChange?.(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {total > 0 && total <= pageSize && (
            <div className="border-t border-slate-800 px-5 py-3">
              <p className="text-xs text-slate-500">Total Records : ({total})</p>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ------------------------------- whole page ----------------------------- */

/**
 * A complete reference screen: filter panel, optional summary, results table.
 *
 * The reference splits some flows across several pages (search on one, create
 * on another). Here they collapse into one screen — `actions` carries the
 * create button and the page renders its own modal.
 */
export function SearchPage({
  title,
  subtitle,
  path,
  fields,
  columns,
  initialFilters = {},
  pageSize = 25,
  tableTitle,
  emptyMessage,
  emptyHint,
  actions,
  summary,
  note,
  transform,
  children,
  headerActions,
}) {
  const blank = useMemo(
    () => fields.reduce((acc, f) => ({ ...acc, [f.name]: '' }), { ...initialFilters }),
    // Field lists are declared inline per page and never change at runtime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [draft, setDraft] = useState(blank);
  const [applied, setApplied] = useState(blank);
  const [page, setPage] = useState(0);

  const { data, loading, error, reload } = useBackofficeData(path, applied, {
    page,
    pageSize,
  });

  const setField = (name, value) => setDraft((d) => ({ ...d, [name]: value }));

  const search = () => {
    setPage(0); // a new filter set always starts from the first page
    setApplied(draft);
  };

  const clear = () => {
    setDraft(blank);
    setApplied(blank);
    setPage(0);
  };

  const rows = transform ? transform(data) : data?.rows;

  return (
    <AdminShell title={title} subtitle={subtitle} actions={headerActions}>
      <div className="space-y-5">
        <FilterPanel
          fields={fields}
          values={draft}
          onChange={setField}
          onSearch={search}
          onClear={clear}
          busy={loading}
        />

        {summary?.(data)}

        <ResultTable
          title={tableTitle ?? title}
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          emptyMessage={emptyMessage}
          emptyHint={emptyHint}
          actions={actions}
          note={note}
        />

        {children}
      </div>
    </AdminShell>
  );
}

/* ------------------------------ shared columns -------------------------- */

export const col = {
  date: (key = 'date', label = 'Date') => ({
    key,
    label,
    render: (r) => fmtDate(r[key]),
  }),
  /**
   * ITZ ("Indian Time Zone") companion to {@link col.date} — the same instant
   * off the same field, always pinned to IST regardless of the reader's own
   * clock. Placed directly after the date column it pairs with.
   */
  itz: (key = 'date', label = 'ITZ') => ({
    key: `${key}Itz`,
    label,
    sortable: false,
    render: (r) => fmtDate(r[key]),
  }),
  money: (key, label) => ({
    key,
    label,
    render: (r) => inr(r[key]),
  }),
  /** Money that reads green when positive and red when negative. */
  signed: (key, label) => ({
    key,
    label,
    render: (r) => (
      <span className={Number(r[key]) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
        {inr(r[key])}
      </span>
    ),
  }),
  text: (key, label) => ({
    key,
    label,
    render: (r) => r[key] ?? '—',
  }),
  number: (key, label) => ({
    key,
    label,
    render: (r) => Number(r[key] ?? 0).toLocaleString('en-IN'),
  }),
  percent: (key, label) => ({
    key,
    label,
    render: (r) => `${Number(r[key] ?? 0)}%`,
  }),
};
