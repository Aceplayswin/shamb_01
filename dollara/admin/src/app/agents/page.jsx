'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Network, Eye, Trash2, Wallet } from 'lucide-react';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  Button,
  Modal,
  Field,
  Input,
  Textarea,
  ErrorState,
  confirmDialog,
  toast,
  fmtDate,
  inr,
  useAdminData,
} from '@/components/admin/AdminShell';
import { LevelBadge } from '@/components/admin/AgentLevel';
import { adminApi } from '@/services/adminApi';

export default function AgentListPage() {
  const router = useRouter();
  const { data, loading, error, reload, setData } = useAdminData(
    '/api/v1/admin/agents?limit=200',
    [],
  );

  const [creditRow, setCreditRow] = useState(null);
  const [credit, setCredit] = useState({ amount: '', remark: '' });
  const [busy, setBusy] = useState(false);

  const items = data?.records ?? [];
  const summary = data?.summary;

  const toggleStatus = async (row) => {
    const isSuspending = row.status === 'active';
    const nextStatus = isSuspending ? 'suspended' : 'active';

    const ok = await confirmDialog({
      title: `${isSuspending ? 'Suspend' : 'Reactivate'} agent?`,
      text: isSuspending
        ? `${row.name} is signed out and neither they nor their downline can place `
          + 'new bets. Balances and open exposure are untouched.'
        : `${row.name} regains access to the panel.`,
      confirmText: isSuspending ? 'Suspend' : 'Reactivate',
      danger: isSuspending,
    });
    if (!ok) return;

    try {
      await adminApi(`/api/v1/admin/agents/${row.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus }),
      });
      toast.success(`Agent ${isSuspending ? 'suspended' : 'reactivated'}`);
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

  const deleteAgent = async (row) => {
    const ok = await confirmDialog({
      title: 'Delete agent?',
      text: `This permanently removes ${row.name} along with their transfer, `
        + 'settlement and audit history. It is refused while they hold a balance, '
        + 'carry open exposure, or have any downline left.',
      confirmText: 'Delete permanently',
      danger: true,
    });
    if (!ok) return;

    try {
      await adminApi(`/api/v1/admin/agents/${row.id}`, { method: 'DELETE' });
      toast.success('Agent deleted');
      reload();
    } catch (e) {
      // The API refuses while anything still hangs off the account and says so.
      toast.error(e.message);
    }
  };

  const openCredit = (row) => {
    setCreditRow(row);
    setCredit({ amount: '', remark: '' });
  };

  const submitCredit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await adminApi(`/api/v1/admin/agents/${creditRow.id}/credit`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(credit.amount),
          remark: credit.remark,
        }),
      });
      toast.success(`Balance is now ${inr(result.balance)}`);
      setCreditRow(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Agent',
      render: (r) => (
        <div>
          <p className="font-medium text-white">{r.name}</p>
          <p className="text-xs text-slate-500">
            {r.username || r.code}
            {r.parent_name ? ` · under ${r.parent_name}` : ' · root'}
          </p>
        </div>
      ),
    },
    {
      key: 'level',
      label: 'Level',
      render: (r) => <LevelBadge level={r.level} label={r.level_label} />,
      filter: 'select',
      filterOptions: (data?.levels ?? []).map((l) => ({
        value: l.value,
        label: l.label,
      })),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
      filter: 'select',
      filterOptions: [
        { value: 'active', label: 'Active' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'locked', label: 'Locked' },
        { value: 'closed', label: 'Closed' },
      ],
    },
    {
      key: 'partnership',
      label: 'Terms',
      render: (r) => (
        <div>
          <p className="text-slate-300">{r.partnership}% partnership</p>
          <p className="text-xs text-slate-500">{r.commission_rate}% commission</p>
        </div>
      ),
    },
    {
      key: 'balance',
      label: 'Credit',
      render: (r) => (
        <div>
          <p className="font-semibold text-white">{inr(r.balance)}</p>
          {r.exposure > 0 && (
            <p className="text-xs text-slate-500">{inr(r.exposure)} exposed</p>
          )}
        </div>
      ),
    },
    {
      key: 'unsettled_pl',
      label: 'Unsettled P&L',
      render: (r) => (
        <span
          className={
            r.unsettled_pl > 0
              ? 'font-semibold text-emerald-400'
              : r.unsettled_pl < 0
                ? 'font-semibold text-rose-400'
                : 'text-slate-500'
          }
        >
          {inr(r.unsettled_pl)}
        </span>
      ),
    },
    {
      key: 'downline',
      label: 'Downline',
      render: (r) => (
        <div>
          <p className="text-slate-300">{r.downline} agents</p>
          <p className="text-xs text-slate-500">{r.players} players</p>
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
          <Button variant="secondary" size="sm" icon={Eye} onClick={() => router.push(`/agents/${r.id}`)}>
            View
          </Button>
          <Button variant="ghost" size="sm" icon={Wallet} onClick={() => openCredit(r)}>
            Credit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toggleStatus(r)}>
            {r.status === 'active' ? 'Suspend' : 'Reactivate'}
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => deleteAgent(r)} className="text-slate-400 hover:text-rose-400" />
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <AdminShell title="Agents" subtitle="Downline operator accounts">
        <ErrorState message={error} onRetry={reload} />
      </AdminShell>
    );
  }

  const amount = Number(credit.amount || 0);

  return (
    <AdminShell
      title="Agents"
      subtitle={
        `${summary?.active ?? 0} active · ${inr(summary?.total_balance ?? 0)} credit outstanding`
        + ` · ${inr(summary?.total_exposure ?? 0)} exposed`
      }
    >
      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        searchable
        searchKeys={['name', 'username', 'code', 'email', 'parent_name']}
        searchPlaceholder="Search by name, username, code…"
        noun="agent"
        pageSize={15}
        emptyIcon={Network}
        emptyMessage="No agents yet"
        emptyHint="Approved applications appear here, as do accounts an upline opens itself."
      />

      <Modal
        open={!!creditRow}
        onClose={() => setCreditRow(null)}
        title="Adjust platform credit"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreditRow(null)}>
              Cancel
            </Button>
            <Button form="credit-form" type="submit" busy={busy} disabled={!amount}>
              {amount < 0 ? 'Claw back' : 'Add credit'}
            </Button>
          </>
        }
      >
        <form id="credit-form" onSubmit={submitCredit} className="space-y-4">
          <p className="text-sm text-slate-400">
            Credit moved here comes from the platform, not from an upline&apos;s
            balance — this is the only way to fund an account at the top of the
            tree. It lands on{' '}
            <span className="font-semibold text-white">{creditRow?.name}</span>&apos;s
            transfer statement, marked as a platform adjustment.
          </p>

          <div className="rounded-lg bg-slate-950 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Current balance</span>
              <span className="text-slate-200">{inr(creditRow?.balance)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-500">Free of open bets</span>
              <span className="text-slate-200">{inr(creditRow?.available_credit)}</span>
            </div>
          </div>

          <Field label="Amount (₹)">
            <Input
              type="number"
              step="0.01"
              required
              autoFocus
              placeholder="Negative to claw back"
              value={credit.amount}
              onChange={(e) => setCredit({ ...credit, amount: e.target.value })}
            />
          </Field>
          {/* A clawback is capped at available credit, not balance — money
              already committed to open bets is not the operator's to remove. */}
          {amount < 0 && (
            <p className="-mt-2 text-xs text-amber-400">
              Clawing back {inr(-amount)}. Refused above{' '}
              {inr(creditRow?.available_credit)}, which is what is free of open bets.
            </p>
          )}

          <Field label="Remark">
            <Textarea
              rows={2}
              placeholder="e.g. Opening float for the Q3 launch"
              value={credit.remark}
              onChange={(e) => setCredit({ ...credit, remark: e.target.value })}
            />
          </Field>
        </form>
      </Modal>
    </AdminShell>
  );
}
