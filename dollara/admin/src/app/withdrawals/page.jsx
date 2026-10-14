'use client';

import { useMemo, useState } from 'react';
import {
  ArrowUpFromLine,
  Check,
  X,
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

/** Local calendar date as YYYY-MM-DD (not UTC — ops work in local time). */
function localDateISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const METHOD_LABELS = {
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  crypto: 'Crypto',
};

// The player's payout destination, stored by services.create_withdrawal as a
// "Label: value | Label: value" string. Split back into rows so an admin can
// read (and copy) each part instead of scanning one long line.
function PayoutDetails({ reference }) {
  if (!reference) return <span className="text-slate-600">—</span>;

  const parts = reference.split('|').map((p) => p.trim()).filter(Boolean);
  return (
    <div className="space-y-0.5">
      {parts.map((part) => {
        const idx = part.indexOf(':');
        const label = idx === -1 ? null : part.slice(0, idx).trim();
        const value = idx === -1 ? part : part.slice(idx + 1).trim();
        return (
          <p key={part} className="whitespace-nowrap text-xs">
            {label && <span className="text-slate-500">{label}: </span>}
            <span className="font-mono text-slate-200">{value}</span>
          </p>
        );
      })}
    </div>
  );
}

const TAB_COPY = {
  all: {
    title: 'Withdrawals',
    subtitle: (n) => `${n} in total`,
    empty: 'No withdrawals',
    hint: 'Every request — pending, approved and rejected — in one list.',
  },
  pending: {
    title: 'Pending Withdrawals',
    subtitle: (n) => `${n} awaiting review`,
    empty: 'No pending withdrawals',
    hint: 'Approved payouts move to Transactions.',
  },
  approved: {
    title: 'Approved Withdrawals',
    subtitle: (n) => `${n} paid out`,
    empty: 'No approved withdrawals',
    hint: 'Payouts you approve appear here.',
  },
  rejected: {
    title: 'Rejected Withdrawals',
    subtitle: (n) => `${n} rejected`,
    empty: 'No rejected withdrawals',
    hint: 'Rejected payouts appear here; the funds were returned to the player.',
  },
};

/** A request still awaiting review — the only kind that can be actioned. */
const isPending = (r) => r?.status === 'pending' || r?.status === 'processing';

export default function AdminWithdrawalsPage() {
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
    `/api/v1/admin/withdrawals/pending?tab=${tab}${dateParams ? `&${dateParams}` : ''}`,
    [tab, dateFrom, dateTo],
  );
  // Badge counts load separately so they stay accurate regardless of which
  // tab's rows are currently on screen.
  const { data: counts, reload: reloadCounts } = useAdminData(
    `/api/v1/admin/withdrawals/counts${dateParams ? `?${dateParams}` : ''}`,
    [dateFrom, dateTo],
  );
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const approve = async (row) => {
    const ok = await confirmDialog({
      title: 'Approve withdrawal?',
      // Show the destination here too: this dialog is the last step before the
      // money actually leaves, so the admin should confirm where it is going.
      text:
        `Approve payout of ${inr(row.amount)} to ${row.full_name || row.username}` +
        ` via ${METHOD_LABELS[row.payment_method] ?? row.payment_method ?? 'unknown method'}.` +
        (row.reference_number ? `\n\n${row.reference_number}` : ''),
      confirmText: 'Approve',
      icon: 'question',
    });
    if (!ok) return;
    try {
      await adminApi(`/api/v1/admin/withdrawals/${row.id}/approve`, { method: 'POST' });
      toast.success('Withdrawal approved');
      setData((prev) => prev?.filter((w) => w.id !== row.id) ?? []);
      reloadCounts();
    } catch (e) {
      toast.error(e.message);
      reload();
    }
  };

  const reject = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi(`/api/v1/admin/withdrawals/${rejectRow.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      });
      toast.success('Withdrawal rejected & funds returned');
      setData((prev) => prev?.filter((w) => w.id !== rejectRow.id) ?? []);
      reloadCounts();
      setRejectRow(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
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
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-semibold text-rose-400">{inr(r.amount)}</span> },
    {
      key: 'payment_method',
      label: 'Method',
      filter: 'select',
      render: (r) => (
        <span className="text-xs font-medium text-slate-300">
          {METHOD_LABELS[r.payment_method] ?? r.payment_method ?? '—'}
        </span>
      ),
    },
    {
      key: 'reference_number',
      label: 'Payout details',
      sortable: false,
      render: (r) => <PayoutDetails reference={r.reference_number} />,
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    // Why the payout was turned down (or any note left on it) — shown on every
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
    // Approve/Reject apply only to a request still awaiting review; a settled
    // one would be refused server-side, so the buttons are not shown.
    ...(tab === 'pending' || tab === 'all'
      ? [
          {
            key: 'actions',
            label: '',
            render: (r) => isPending(r) && (
              <div className="flex justify-end gap-1.5">
                <Button variant="success" size="sm" icon={Check} onClick={() => approve(r)}>
                  Approve
                </Button>
                <Button variant="danger" size="sm" icon={X} onClick={() => setRejectRow(r)}>
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
          hint={`${(counts?.pending ?? 0) + (counts?.approved ?? 0) + (counts?.rejected ?? 0)} withdrawals`}
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
          hint={`${counts?.approved ?? 0} paid out`}
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
        searchPlaceholder="Search withdrawals…"
        noun="withdrawal"
        pageSize={15}
        emptyIcon={ArrowUpFromLine}
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

      <Modal
        open={!!rejectRow}
        onClose={() => setRejectRow(null)}
        title="Reject withdrawal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectRow(null)}>
              Cancel
            </Button>
            <Button variant="danger" form="reject-form" type="submit" disabled={busy}>
              {busy ? 'Rejecting…' : 'Reject & refund'}
            </Button>
          </>
        }
      >
        <form id="reject-form" onSubmit={reject} className="space-y-4">
          <p className="text-sm text-slate-400">
            Rejecting returns {inr(rejectRow?.amount)} to the player&apos;s main balance.
          </p>
          <Field label="Reason (optional)">
            <Textarea
              rows={3}
              placeholder="e.g. KYC mismatch"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </Field>
        </form>
      </Modal>
    </AdminShell>
  );
}
