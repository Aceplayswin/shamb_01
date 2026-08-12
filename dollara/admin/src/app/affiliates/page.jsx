'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Eye, Trash2, PlayCircle } from 'lucide-react';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  Button,
  ErrorState,
  confirmDialog,
  toast,
  fmtDate,
  inr,
  useAdminData,
} from '@/components/admin/AdminShell';
import { adminApi } from '@/services/adminApi';

const TIER_COLORS = {
  Bronze:   'border-orange-500/30 bg-orange-500/15 text-orange-400',
  Silver:   'border-slate-400/30 bg-slate-400/15 text-slate-300',
  Gold:     'border-amber-500/30 bg-amber-500/15 text-amber-400',
  Platinum: 'border-violet-500/30 bg-violet-500/15 text-violet-400',
};

export default function AffiliateListPage() {
  const router = useRouter();
  const { data, loading, error, reload, setData } = useAdminData(
    '/api/v1/admin/affiliates?limit=200',
    [],
  );
  const [running, setRunning] = useState(false);

  const items = data?.records ?? [];

  const toggleStatus = async (row) => {
    const isSuspending = row.status === 'approved';
    const nextStatus = isSuspending ? 'suspended' : 'approved';

    const ok = await confirmDialog({
      title: `${isSuspending ? 'Suspend' : 'Reactivate'} affiliate?`,
      text: isSuspending
        ? `${row.name} will be signed out and their tracking links stop attributing new signups. `
          + 'Commission already earned is unaffected.'
        : `${row.name} regains access and their links start attributing again.`,
      confirmText: isSuspending ? 'Suspend' : 'Reactivate',
      danger: isSuspending,
    });
    if (!ok) return;

    try {
      await adminApi(`/api/v1/admin/affiliates/${row.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus }),
      });
      toast.success(`Affiliate ${isSuspending ? 'suspended' : 'reactivated'}`);
      // Optimistic, with a reload on failure — the pattern used across the console.
      setData((prev) => ({
        ...prev,
        records: prev.records.map((a) =>
          a.id === row.id ? { ...a, status: nextStatus } : a,
        ),
      }));
    } catch (e) {
      toast.error(e.message);
      reload();
    }
  };

  const deleteAffiliate = async (row) => {
    const ok = await confirmDialog({
      title: 'Delete affiliate?',
      text: `This permanently removes ${row.name} along with their links, referrals `
        + 'and ledger. It is refused while they are owed unpaid commission.',
      confirmText: 'Delete permanently',
      danger: true,
    });
    if (!ok) return;

    try {
      await adminApi(`/api/v1/admin/affiliates/${row.id}`, { method: 'DELETE' });
      toast.success('Affiliate deleted');
      reload();
    } catch (e) {
      // The API refuses while commission is outstanding and says so.
      toast.error(e.message);
    }
  };

  /** Same entry point as the nightly command, so the two cannot diverge. */
  const runCommissions = async () => {
    const ok = await confirmDialog({
      title: 'Run commissions now?',
      text: 'Calculates yesterday\'s commission for every approved affiliate. '
        + 'Safe to run more than once — entries already approved or paid are never rewritten.',
      confirmText: 'Run now',
    });
    if (!ok) return;

    setRunning(true);
    try {
      const result = await adminApi('/api/v1/admin/affiliates/commissions/run', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      toast.success(
        `${result.entries_written} entries written, ${result.entries_skipped} skipped, `
        + `${inr(result.total_amount)} total`,
      );
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  const formatCommission = (r) => {
    if (r.commission_type === 'revenue_share') return `${r.commission_rate}% Rev Share`;
    if (r.commission_type === 'cpa') return `${inr(r.cpa_amount)} CPA`;
    return `${r.commission_rate}% + ${inr(r.cpa_amount)} Hybrid`;
  };

  const columns = [
    {
      key: 'name',
      label: 'Affiliate',
      render: (r) => (
        <div>
          <p className="font-medium text-white">{r.name}</p>
          <p className="text-xs text-slate-500">{r.company || 'Individual'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
      filter: 'select',
      filterOptions: [
        { value: 'approved', label: 'Approved' },
        { value: 'suspended', label: 'Suspended' },
      ],
    },
    {
      key: 'tier_label',
      label: 'Tier',
      render: (r) => (
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${TIER_COLORS[r.tier_label] || TIER_COLORS.Bronze}`}>
          {r.tier_label}
        </span>
      ),
      filter: 'select',
      filterOptions: [
        { value: 'Bronze', label: 'Bronze' },
        { value: 'Silver', label: 'Silver' },
        { value: 'Gold', label: 'Gold' },
        { value: 'Platinum', label: 'Platinum' },
      ],
    },
    {
      key: 'commission_type',
      label: 'Commission',
      render: (r) => <span className="text-slate-300">{formatCommission(r)}</span>,
      filter: 'select',
      filterOptions: [
        { value: 'revenue_share', label: 'Revenue Share' },
        { value: 'cpa', label: 'CPA' },
        { value: 'hybrid', label: 'Hybrid' },
      ],
    },
    {
      key: 'total_players',
      label: 'Players',
      render: (r) => <span className="font-semibold text-white">{r.total_players}</span>,
    },
    {
      key: 'total_earnings',
      label: 'Earnings',
      render: (r) => (
        <div>
          <p className="font-semibold text-emerald-400">{inr(r.total_earnings)}</p>
          {r.pending_earnings > 0 && (
            <p className="text-xs text-slate-500">{inr(r.pending_earnings)} pending</p>
          )}
        </div>
      ),
    },
    {
      key: 'joined_at',
      label: 'Joined',
      render: (r) => fmtDate(r.joined_at),
      filter: 'date',
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="secondary" size="sm" icon={Eye} onClick={() => router.push(`/affiliates/${r.id}`)}>
            View
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toggleStatus(r)}>
            {r.status === 'approved' ? 'Suspend' : 'Reactivate'}
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => deleteAffiliate(r)} className="text-slate-400 hover:text-rose-400" />
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <AdminShell title="Affiliates" subtitle="Partner accounts">
        <ErrorState message={error} onRetry={reload} />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Affiliates"
      subtitle={`${data?.summary?.active ?? 0} active · ${inr(data?.summary?.total_earnings ?? 0)} lifetime commission`}
      actions={
        <Button icon={PlayCircle} busy={running} onClick={runCommissions}>
          Run commissions now
        </Button>
      }
    >
      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        searchable
        searchKeys={['name', 'company', 'email']}
        searchPlaceholder="Search by name, company, email…"
        noun="affiliate"
        pageSize={15}
        emptyIcon={Users}
        emptyMessage="No affiliates yet"
        emptyHint="Approved applications will appear here."
      />
    </AdminShell>
  );
}
