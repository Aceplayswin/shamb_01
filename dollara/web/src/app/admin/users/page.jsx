'use client';

import { useState } from 'react';
import { Users, Eye, Wallet, Phone, Mail, ShieldAlert, PlusCircle, MinusCircle } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  Select,
  Modal,
  Button,
  Field,
  Input,
  Card,
  toast,
  useAdminData,
  inr,
  fmtDate,
} from '@/components/admin/AdminShell';

export default function AdminUsersPage() {
  const { data: users, loading, reload } = useAdminData('/api/v1/admin/users?limit=200', []);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adjustUser, setAdjustUser] = useState(null);
  const [adjustMode, setAdjustMode] = useState('add'); // 'add' | 'deduct'
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const openAdjust = (user) => {
    setAdjustUser(user);
    setAdjustMode('add');
    setAdjustAmount('');
    setAdjustNotes('');
  };

  const patchUser = async (userId, body, msg) => {
    try {
      await adminApi(`/api/v1/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      toast.success(msg);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const openDetail = async (userId) => {
    setDetailLoading(true);
    setDetail({ id: userId });
    try {
      const data = await adminApi(`/api/v1/admin/users/${userId}`);
      setDetail(data);
    } catch (e) {
      toast.error(e.message);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    const magnitude = Math.abs(parseFloat(adjustAmount) || 0);
    if (!magnitude) {
      toast.error('Enter an amount greater than 0');
      return;
    }
    const signedAmount = adjustMode === 'deduct' ? -magnitude : magnitude;
    setBusy(true);
    try {
      await adminApi(`/api/v1/admin/users/${adjustUser.id}/wallet/adjust`, {
        method: 'POST',
        body: JSON.stringify({ amount: signedAmount, notes: adjustNotes }),
      });
      toast.success(adjustMode === 'deduct' ? `${inr(magnitude)} deducted` : `${inr(magnitude)} added`);
      setAdjustUser(null);
      setAdjustAmount('');
      setAdjustNotes('');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'username',
      label: 'User',
      render: (r) => (
        <div>
          <p className="font-medium text-white">{r.full_name || r.username}</p>
          <p className="text-xs text-slate-500">{r.phone || r.email || r.username}</p>
        </div>
      ),
    },
    { key: 'main_balance', label: 'Balance', render: (r) => inr(r.main_balance) },
    { key: 'bonus_balance', label: 'Bonus', render: (r) => inr(r.bonus_balance) },
    {
      key: 'kyc_status',
      label: 'KYC',
      render: (r) => <StatusBadge status={r.kyc_status} />,
      filter: 'select',
      filterLabel: 'KYC status',
      filterOptions: [
        { value: 'verified', label: 'Verified' },
        { value: 'pending', label: 'Pending' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'none', label: 'None' },
      ],
    },
    {
      key: 'account_status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.account_status} />,
      filter: 'select',
      filterLabel: 'Account status',
      filterOptions: [
        { value: 'active', label: 'Active' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'blocked', label: 'Blocked' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    { key: 'created_at', label: 'Joined', render: (r) => fmtDate(r.created_at), filter: 'date' },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="secondary" size="sm" icon={Eye} onClick={() => openDetail(r.id)}>
            View
          </Button>
          <Button variant="ghost" size="sm" icon={Wallet} onClick={() => openAdjust(r)}>
            Adjust
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell title="Users" subtitle={`${users?.length ?? 0} registered players`}>
      <DataTable
        columns={columns}
        rows={users}
        loading={loading}
        searchable
        searchKeys={['username', 'full_name', 'phone', 'email']}
        searchPlaceholder="Search by name, phone, email…"
        noun="user"
        pageSize={15}
        emptyIcon={Users}
        emptyMessage="No users yet"
        emptyHint="Registered players will appear here."
        filterSubtitle="Combine any filters to narrow the list"
      />

      {/* Detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="User profile" size="lg">
        {detailLoading || !detail?.username ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-800/60" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-xl bg-indigo-500/15 font-display text-xl font-bold text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
                {(detail.full_name || detail.username || '?').slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="font-display text-lg font-bold text-white">
                  {detail.full_name || detail.username}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={detail.account_status} />
                  <StatusBadge status={detail.kyc_status} />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="p-4">
                <p className="text-xs text-slate-500">Main balance</p>
                <p className="mt-1 font-display text-lg font-bold text-white">{inr(detail.main_balance)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-500">Bonus balance</p>
                <p className="mt-1 font-display text-lg font-bold text-white">{inr(detail.bonus_balance)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-500">Fraud score</p>
                <p className="mt-1 font-display text-lg font-bold text-white">{detail.fraud_score ?? 0}</p>
              </Card>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2 text-slate-400"><Phone className="h-4 w-4" /> {detail.phone || '—'}</p>
              <p className="flex items-center gap-2 text-slate-400"><Mail className="h-4 w-4" /> {detail.email || '—'}</p>
              <p className="flex items-center gap-2 text-slate-400"><ShieldAlert className="h-4 w-4" /> {detail.country_code} · {detail.currency}</p>
              <p className="text-slate-400">Joined {fmtDate(detail.created_at)}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Recent transactions
              </p>
              <div className="max-h-40 space-y-1.5 overflow-y-auto">
                {detail.transactions?.length ? (
                  detail.transactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2 text-sm">
                      <span className="capitalize text-slate-300">{t.type.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-white">{inr(t.amount)}</span>
                      <StatusBadge status={t.status} />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No transactions</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select
                value={detail.account_status}
                onChange={(e) => {
                  patchUser(detail.id, { account_status: e.target.value }, 'Status updated');
                  setDetail({ ...detail, account_status: e.target.value });
                }}
                className="max-w-[160px]"
              >
                <option value="active">active</option>
                <option value="suspended">suspended</option>
                <option value="blocked">blocked</option>
                <option value="inactive">inactive</option>
              </Select>
              <Select
                value={detail.kyc_status}
                onChange={(e) => {
                  patchUser(detail.id, { kyc_status: e.target.value }, 'KYC updated');
                  setDetail({ ...detail, kyc_status: e.target.value });
                }}
                className="max-w-[160px]"
              >
                <option value="none">KYC: none</option>
                <option value="pending">KYC: pending</option>
                <option value="verified">KYC: verified</option>
                <option value="rejected">KYC: rejected</option>
              </Select>
              <Button
                variant="secondary"
                icon={Wallet}
                onClick={() => {
                  openAdjust(detail);
                  setDetail(null);
                }}
              >
                Adjust wallet
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Wallet adjust modal */}
      <Modal
        open={!!adjustUser}
        onClose={() => setAdjustUser(null)}
        title="Wallet adjustment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustUser(null)}>
              Cancel
            </Button>
            <Button
              form="adjust-form"
              type="submit"
              variant={adjustMode === 'deduct' ? 'danger' : 'success'}
              disabled={busy}
            >
              {busy
                ? 'Applying…'
                : adjustMode === 'deduct'
                ? 'Deduct money'
                : 'Add money'}
            </Button>
          </>
        }
      >
        <form id="adjust-form" onSubmit={submitAdjust} className="space-y-4">
          <p className="text-sm text-slate-400">
            Adjusting balance for{' '}
            <span className="font-semibold text-white">{adjustUser?.full_name || adjustUser?.username}</span>
            {' · current balance '}
            <span className="font-semibold text-white">{inr(adjustUser?.main_balance)}</span>
          </p>

          <Field label="Action">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustMode('add')}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition ${
                  adjustMode === 'add'
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <PlusCircle className="h-4 w-4" /> Add money
              </button>
              <button
                type="button"
                onClick={() => setAdjustMode('deduct')}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition ${
                  adjustMode === 'deduct'
                    ? 'border-rose-500/50 bg-rose-500/15 text-rose-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <MinusCircle className="h-4 w-4" /> Deduct money
              </button>
            </div>
          </Field>

          <Field label="Amount">
            <div className="relative">
              <span
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold ${
                  adjustMode === 'deduct' ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {adjustMode === 'deduct' ? '−' : '+'}
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 500"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="pl-7"
                required
              />
            </div>
          </Field>

          {adjustAmount && !Number.isNaN(parseFloat(adjustAmount)) && (
            <div
              className={`rounded-lg border px-3.5 py-2.5 text-sm ${
                adjustMode === 'deduct'
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              }`}
            >
              {adjustMode === 'deduct' ? 'Deducting' : 'Adding'}{' '}
              <span className="font-semibold">{inr(Math.abs(parseFloat(adjustAmount) || 0))}</span>
              {' — new balance will be '}
              <span className="font-semibold">
                {inr(
                  (Number(adjustUser?.main_balance) || 0) +
                    (adjustMode === 'deduct' ? -1 : 1) * Math.abs(parseFloat(adjustAmount) || 0)
                )}
              </span>
            </div>
          )}

          <Field label="Notes">
            <Input
              placeholder="Reason for adjustment"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
            />
          </Field>
        </form>
      </Modal>
    </AdminShell>
  );
}
