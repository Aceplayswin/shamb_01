'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  X,
  Image as ImageIcon,
  ExternalLink,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import CashierTabs, {
  CASHIER_STATUS_OPTIONS,
  cashierTabCount,
} from '@/components/admin/CashierTabs';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  StatCard,
  Button,
  Modal,
  Field,
  Input,
  Select,
  Textarea,
  confirmDialog,
  toast,
  useAdminData,
  inr,
  fmtDate,
} from '@/components/admin/AdminShell';

const TAB_COPY = {
  all: {
    title: 'Deposits',
    subtitle: (n) => `${n} in total`,
    empty: 'No deposits',
    hint: 'Every request — pending, approved and rejected — in one list.',
  },
  pending: {
    title: 'Pending Deposits',
    subtitle: (n) => `${n} awaiting approval`,
    empty: 'No pending deposits',
    hint: 'Approved deposits move to Transactions.',
  },
  approved: {
    title: 'Approved Deposits',
    subtitle: (n) => `${n} credited`,
    empty: 'No approved deposits',
    hint: 'Deposits you confirm appear here.',
  },
  rejected: {
    title: 'Rejected Deposits',
    subtitle: (n) => `${n} rejected`,
    empty: 'No rejected deposits',
    hint: 'Deposits you reject appear here, with the reason.',
  },
};

/** Local calendar date as YYYY-MM-DD (not UTC — ops work in local time). */
function localDateISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** A request still awaiting review — the only kind that can be actioned. */
const isPending = (r) => r?.status === 'pending' || r?.status === 'processing';

/** Sum of `amount` across rows, rounded to paise so float drift never shows. */
const sumAmount = (rows) =>
  Math.round(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0) * 100) / 100;

export default function AdminDepositsPage() {
  const [tab, setTab] = useState('pending');
  // Cards + list default to today; Filters can widen/narrow the range.
  const [dateFrom, setDateFrom] = useState(localDateISO);
  const [dateTo, setDateTo] = useState(localDateISO);
  const today = localDateISO();
  const dateParams = useMemo(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString();
  }, [dateFrom, dateTo]);
  const { data: items, loading, reload, setData } = useAdminData(
    `/api/v1/admin/deposits/pending?tab=${tab}${dateParams ? `&${dateParams}` : ''}`,
    [tab, dateFrom, dateTo],
  );
  // Tab badges come from their own endpoint so a count stays correct while
  // another tab's rows are on screen; reloaded whenever a request is actioned.
  const { data: counts, reload: reloadCounts } = useAdminData(
    `/api/v1/admin/deposits/counts${dateParams ? `?${dateParams}` : ''}`,
    [dateFrom, dateTo],
  );
  const [busyId, setBusyId] = useState(null);
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  // The screenshot being viewed full-size before approving/rejecting.
  const [proofRow, setProofRow] = useState(null);

  const confirm = async (row) => {
    const ok = await confirmDialog({
      title: 'Approve deposit?',
      text: `Credit ${inr(row.amount)} to ${row.full_name || row.username}'s wallet.`,
      confirmText: 'Approve & credit',
      icon: 'question',
    });
    if (!ok) return;
    setBusyId(row.id);
    try {
      await adminApi(`/api/v1/admin/deposits/${row.id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ referenceNumber: `ADMIN-${Date.now()}` }),
      });
      toast.success('Deposit credited');
      setData((prev) => prev?.filter((d) => d.id !== row.id) ?? []);
      reloadCounts();
    } catch (e) {
      toast.error(e.message);
      reload();
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (e) => {
    e.preventDefault();
    setRejecting(true);
    try {
      await adminApi(`/api/v1/admin/deposits/${rejectRow.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      });
      toast.success('Deposit rejected — no funds credited');
      setData((prev) => prev?.filter((d) => d.id !== rejectRow.id) ?? []);
      reloadCounts();
      setRejectRow(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRejecting(false);
    }
  };

  const columns = [
    // Created date range lives in Filters (server-side) so cards and the list
    // stay in sync — the column itself is display-only.
    { key: 'created_at', label: 'Created', render: (r) => fmtDate(r.created_at) },
    // When the request was actually actioned, so a report shows how long it sat
    // pending rather than only when the player raised it.
    {
      key: 'settled_at',
      label: 'Settled',
      sortable: false,
      render: (r) => (r.settled_at ? fmtDate(r.settled_at) : '—'),
    },
    {
      key: 'username',
      label: 'User',
      render: (r) => (
        <div>
          <p className="font-medium text-white">{r.full_name || r.username}</p>
          <p className="text-xs text-slate-500">{r.username}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (r) => <span className="font-semibold text-emerald-400">{inr(r.amount)}</span>,
      // Sum of the rows on screen; when the list spans several pages the
      // grand total of every matching row is shown underneath.
      footer: (pageRows, allRows) => (
        <div>
          <span className="font-bold text-emerald-400">{inr(sumAmount(pageRows))}</span>
          {allRows.length > pageRows.length && (
            <p className="text-xs font-normal text-slate-500">
              {inr(sumAmount(allRows))} across all pages
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'payment_method',
      label: 'Method',
      render: (r) => r.payment_method || '—',
      filter: 'select',
      filterLabel: 'Payment method',
    },
    {
      key: 'reference_number',
      label: 'UTR',
      sortable: false,
      render: (r) =>
        r.reference_number ? (
          <span className="font-mono text-xs text-slate-300">{r.reference_number}</span>
        ) : (
          <span className="text-slate-600">—</span>
        ),
    },
    {
      key: 'payment_proof_url',
      label: 'Proof',
      sortable: false,
      render: (r) =>
        r.payment_proof_url ? (
          <button
            type="button"
            onClick={() => setProofRow(r)}
            title="View payment screenshot"
            className="inline-flex items-center gap-1.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/20"
          >
            <ImageIcon className="h-3.5 w-3.5" /> View
          </button>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        ),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    // Why a request was turned down (or any note left on it) — shown on every
    // tab so it's visible regardless of status.
    {
      key: 'notes',
      label: 'Reason',
      sortable: false,
      render: (r) =>
        r.notes ? (
          <span className="text-xs text-slate-300">{r.notes}</span>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        ),
    },
    // Approve/Reject only exist while a request is still pending; an already
    // settled one would fail server-side, so the buttons are not offered.
    ...(tab === 'pending' || tab === 'all'
      ? [
          {
            key: 'actions',
            label: '',
            render: (r) => isPending(r) && (
              <div className="flex justify-end gap-1.5">
                <Button variant="success" size="sm" icon={Check} disabled={busyId === r.id} onClick={() => confirm(r)}>
                  {busyId === r.id ? 'Crediting…' : 'Approve'}
                </Button>
                <Button variant="danger" size="sm" icon={X} disabled={busyId === r.id} onClick={() => setRejectRow(r)}>
                  Reject
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const copy = TAB_COPY[tab];
  const sums = counts?.sums;

  return (
    <AdminShell title={copy.title} subtitle={copy.subtitle(cashierTabCount(counts, tab) ?? items?.length ?? 0)}>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total sum"
          value={inr(sums?.total ?? 0)}
          icon={Wallet}
          accent="brand"
          hint={`${(counts?.pending ?? 0) + (counts?.approved ?? 0) + (counts?.rejected ?? 0)} deposits`}
        />
        <StatCard
          label="Pending sum"
          value={inr(sums?.pending ?? 0)}
          icon={Clock}
          accent="amber"
          hint={`${counts?.pending ?? 0} awaiting`}
        />
        <StatCard
          label="Approved sum"
          value={inr(sums?.approved ?? 0)}
          icon={CheckCircle2}
          accent="emerald"
          hint={`${counts?.approved ?? 0} credited`}
        />
        <StatCard
          label="Rejected sum"
          value={inr(sums?.rejected ?? 0)}
          icon={XCircle}
          accent="rose"
          hint={`${counts?.rejected ?? 0} rejected`}
        />
      </div>
      <CashierTabs tab={tab} onChange={setTab} counts={counts} />
      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        searchable
        searchKeys={['username', 'full_name', 'reference_number']}
        searchPlaceholder="Search deposits…"
        noun="deposit"
        pageSize={15}
        emptyIcon={ArrowDownToLine}
        emptyMessage={copy.empty}
        emptyHint={copy.hint}
        filterActive={dateFrom !== today || dateTo !== today || tab !== 'pending'}
        onFilterClear={() => {
          const t = localDateISO();
          setDateFrom(t);
          setDateTo(t);
          setTab('pending');
        }}
        filters={
          <>
            {/* Same state as the tab strip above, so picking here moves the tab
                and vice versa. */}
            <Field label="Status">
              <Select value={tab} onChange={(e) => setTab(e.target.value)}>
                {CASHIER_STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Created">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </Field>
          </>
        }
      />

      {/* Payment screenshot review — the evidence behind a manual deposit.
          Approving from here runs the same confirm that credits the wallet. */}
      <Modal
        open={!!proofRow}
        onClose={() => setProofRow(null)}
        title="Payment proof"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setProofRow(null)}>
              Close
            </Button>
            {/* On a settled deposit the proof is evidence to look back at, not
                something to action — the confirm/reject calls would be refused
                server-side, so only pending requests get the buttons. */}
            {isPending(proofRow) && (
              <>
                <Button
                  variant="danger"
                  icon={X}
                  onClick={() => {
                    const row = proofRow;
                    setProofRow(null);
                    setRejectRow(row);
                  }}
                >
                  Reject
                </Button>
                <Button
                  variant="success"
                  icon={Check}
                  disabled={busyId === proofRow?.id}
                  onClick={async () => {
                    const row = proofRow;
                    setProofRow(null);
                    await confirm(row);
                  }}
                >
                  Approve &amp; credit
                </Button>
              </>
            )}
          </>
        }
      >
        {proofRow && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Player</p>
                <p className="font-medium text-white">
                  {proofRow.full_name || proofRow.username}
                </p>
                <p className="text-xs text-slate-500">{proofRow.username}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Amount</p>
                <p className="font-semibold text-emerald-400">{inr(proofRow.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Method</p>
                <p className="text-slate-300">{proofRow.payment_method || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">UTR / Reference</p>
                <p className="font-mono text-xs text-slate-300">
                  {proofRow.reference_number || '—'}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proofRow.payment_proof_url}
                alt="Payment screenshot"
                className="mx-auto max-h-[55vh] w-auto rounded-md object-contain"
              />
            </div>

            <a
              href={proofRow.payment_proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open full size in a new tab
            </a>

            {isPending(proofRow) && (
              <p className="text-xs text-slate-500">
                Check the amount, date and recipient on the screenshot against the
                request above before crediting. Approving credits the wallet
                immediately.
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!rejectRow}
        onClose={() => setRejectRow(null)}
        title="Reject deposit"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectRow(null)}>
              Cancel
            </Button>
            <Button variant="danger" form="reject-deposit-form" type="submit" disabled={rejecting}>
              {rejecting ? 'Rejecting…' : 'Reject deposit'}
            </Button>
          </>
        }
      >
        <form id="reject-deposit-form" onSubmit={reject} className="space-y-4">
          <p className="text-sm text-slate-400">
            Rejecting marks this {inr(rejectRow?.amount)} deposit as rejected. No funds are credited.
          </p>
          <Field label="Reason (optional)">
            <Textarea
              rows={3}
              placeholder="e.g. Payment not received"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </Field>
        </form>
      </Modal>
    </AdminShell>
  );
}
