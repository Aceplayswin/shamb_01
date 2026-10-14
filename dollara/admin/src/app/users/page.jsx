'use client';

import { useCallback, useMemo, useState } from 'react';
import { Users, Eye, Wallet, PlusCircle, MinusCircle, UserPlus } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import PlayerProfileModal from '@/components/admin/PlayerProfileModal';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  Select,
  Modal,
  Button,
  Field,
  Input,
  toast,
  useAdminData,
  inr,
  fmtDate,
} from '@/components/admin/AdminShell';

const emptySearch = {
  dateFrom: '',
  dateTo: '',
  userId: '',
  affiliateId: '',
  username: '',
  fullName: '',
  phone: '',
  ip: '',
};

function usersListPath(applied, serverQuery) {
  const params = new URLSearchParams();
  if (serverQuery) params.set('search', serverQuery);
  if (applied.dateFrom) params.set('dateFrom', applied.dateFrom);
  if (applied.dateTo) params.set('dateTo', applied.dateTo);
  if (applied.userId.trim()) params.set('userId', applied.userId.trim());
  if (applied.affiliateId.trim()) params.set('affiliateId', applied.affiliateId.trim());
  if (applied.username.trim()) params.set('username', applied.username.trim());
  if (applied.fullName.trim()) params.set('fullName', applied.fullName.trim());
  if (applied.phone.trim()) params.set('phone', applied.phone.trim());
  if (applied.ip.trim()) params.set('ip', applied.ip.trim());
  const qs = params.toString();
  return `/api/v1/admin/users${qs ? `?${qs}` : ''}`;
}

export default function AdminUsersPage() {
  // Search panel above the table. `draft` is what the operator is typing;
  // `applied` is what actually filters the rows, so nothing narrows until Search.
  const [draft, setDraft] = useState(emptySearch);
  const [applied, setApplied] = useState(emptySearch);
  // Term from the table search box. Sent to the API so the match is looked up
  // across every player, not only the rows already on screen.
  const [serverQuery, setServerQuery] = useState('');

  const listPath = useMemo(
    () => usersListPath(applied, serverQuery),
    [applied, serverQuery],
  );
  const { data: users, loading, reload } = useAdminData(listPath, [listPath]);

  const setDraftField = (key) => (e) =>
    setDraft((f) => ({ ...f, [key]: e.target.value }));

  const searchActive = Object.values(applied).some((v) => v !== '');
  const narrowed = searchActive || !!serverQuery;

  const handleServerSearch = useCallback(
    (term) => {
      if (term === serverQuery) return;
      setServerQuery(term);
    },
    [serverQuery],
  );

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adjustUser, setAdjustUser] = useState(null);
  const [adjustMode, setAdjustMode] = useState('add'); // 'add' | 'deduct'
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const emptyCreateForm = {
    full_name: '',
    phone: '',
    password: '',
    country_code: 'IN',
    initial_balance: '',
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);

  const openCreate = () => {
    setCreateForm(emptyCreateForm);
    setCreateOpen(true);
  };

  const setCreateField = (key) => (e) =>
    setCreateForm((f) => ({ ...f, [key]: e.target.value }));

  const submitCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminApi('/api/v1/admin/users/create', {
        method: 'POST',
        body: JSON.stringify({
          full_name: createForm.full_name,
          phone: createForm.phone,
          password: createForm.password,
          country_code: createForm.country_code || 'IN',
          initial_balance: parseFloat(createForm.initial_balance) || 0,
        }),
      });
      toast.success('User created');
      setCreateOpen(false);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

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

  // ---- Profile popup actions -------------------------------------------
  // Each opens its own sub-modal or fires a status change; the profile stays
  // open behind them so the operator keeps their place.
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [resetUser, setResetUser] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [duplicates, setDuplicates] = useState(null);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const openEdit = (u) => {
    setEditForm({
      username: u.username || '',
      full_name: u.full_name || '',
      phone: u.phone || '',
      account_status: u.account_status || 'active',
      fraud_score: u.fraud_score ?? 0,
    });
    setEditUser(u);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setActionBusy(true);
    try {
      const updated = await adminApi(`/api/v1/admin/users/${editUser.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          username: editForm.username.trim(),
          full_name: editForm.full_name.trim(),
          phone: editForm.phone.trim(),
          account_status: editForm.account_status,
          fraud_score: Number(editForm.fraud_score) || 0,
        }),
      });
      toast.success('User updated');
      setDetail((d) => (d ? { ...d, ...updated } : d));
      setEditUser(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const openReset = (u) => {
    setResetPassword('');
    setResetUser(u);
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setActionBusy(true);
    try {
      await adminApi(`/api/v1/admin/users/${resetUser.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: resetPassword }),
      });
      toast.success('Password reset');
      setResetUser(null);
      setResetPassword('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const openDuplicates = async (u) => {
    setDuplicatesLoading(true);
    setDuplicates({ user: u, rows: [] });
    try {
      const rows = await adminApi(`/api/v1/admin/users/${u.id}/duplicates`);
      setDuplicates({ user: u, rows });
    } catch (err) {
      toast.error(err.message);
      setDuplicates(null);
    } finally {
      setDuplicatesLoading(false);
    }
  };

  // Kicking a player out ends their access by deactivating the account; the
  // API has no session-revocation endpoint, so this is the closest real effect.
  const kickOut = async (u) => {
    await patchUser(u.id, { account_status: 'inactive' }, 'Player kicked out');
    setDetail((d) => (d ? { ...d, account_status: 'inactive' } : d));
  };

  const toggleFreeze = async (u) => {
    const next = u.account_status === 'suspended' ? 'active' : 'suspended';
    await patchUser(
      u.id,
      { account_status: next },
      next === 'suspended' ? 'Account frozen' : 'Account unfrozen',
    );
    setDetail((d) => (d ? { ...d, account_status: next } : d));
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
      key: 'created_at',
      label: 'Signup Date',
      render: (r) => fmtDate(r.created_at),
    },
    {
      key: 'username',
      label: 'Username',
      render: (r) => (
        <span className="font-mono text-sm text-slate-300">{r.username || '—'}</span>
      ),
    },
    { key: 'full_name', label: 'Full Name', render: (r) => r.full_name || '—' },
    { key: 'country_code', label: 'Country', render: (r) => r.country_code || '—' },
    {
      key: 'ip',
      label: 'IP',
      render: (r) => <span className="font-mono text-xs">{r.ip || '—'}</span>,
    },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    {
      key: 'created_by_type',
      label: 'Created By',
      render: (r) => <StatusBadge status={r.created_by_type} />,
    },
    { key: 'affiliate_id', label: 'Affiliate ID', render: (r) => r.affiliate_id ?? '—' },
    { key: 'agent_name', label: 'Agent Name', render: (r) => r.agent_name || '—' },
    {
      key: 'main_balance',
      label: 'Balance',
      render: (r) => inr((r.main_balance || 0) + (r.bonus_balance || 0)),
    },
    {
      key: 'actions',
      label: 'Action',
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
    <AdminShell
      title="Users"
      subtitle={
        narrowed
          ? `${users?.length ?? 0} players match`
          : `${users?.length ?? 0} registered players`
      }
      actions={
        <Button icon={UserPlus} onClick={openCreate}>
          Create user
        </Button>
      }
    >
      <DataTable
        columns={columns}
        rows={users}
        filters={
          <div className="space-y-4">
            <Field label="Signup Date">
              <div className="flex items-center gap-2">
                <Input type="date" value={draft.dateFrom} onChange={setDraftField('dateFrom')} />
                <span className="text-slate-500">–</span>
                <Input type="date" value={draft.dateTo} onChange={setDraftField('dateTo')} />
              </div>
            </Field>
            <Field label="User ID">
              <Input value={draft.userId} onChange={setDraftField('userId')} />
            </Field>
            <Field label="Affiliate ID">
              <Input value={draft.affiliateId} onChange={setDraftField('affiliateId')} />
            </Field>
            <Field label="Username">
              <Input value={draft.username} onChange={setDraftField('username')} />
            </Field>
            <Field label="Full Name">
              <Input value={draft.fullName} onChange={setDraftField('fullName')} />
            </Field>
            <Field label="Phone Number">
              <Input value={draft.phone} onChange={setDraftField('phone')} />
            </Field>
            <Field label="IP Address">
              <Input value={draft.ip} onChange={setDraftField('ip')} />
            </Field>
          </div>
        }
        filterActive={searchActive}
        onFilterApply={() => setApplied(draft)}
        onFilterClear={() => {
          setDraft(emptySearch);
          setApplied(emptySearch);
        }}
        loading={loading}
        searchable
        serverSearch
        onServerSearch={handleServerSearch}
        searchingServer={loading && !!serverQuery}
        serverQuery={serverQuery}
        searchKeys={['username', 'full_name', 'phone', 'id', 'ip']}
        searchPlaceholder="Search by name, member ID, phone, IP…"
        noun="user"
        pageSize={15}
        emptyIcon={Users}
        emptyMessage="No users yet"
        emptyHint="Registered players will appear here."
        filterSubtitle="Combine any filters to narrow the list"
      />

      {/* Create user modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create user"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button form="create-user-form" type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create user'}
            </Button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={submitCreate} className="space-y-4">
          <Field label="Full name">
            <Input
              placeholder="e.g. Rahul Sharma"
              value={createForm.full_name}
              onChange={setCreateField('full_name')}
              required
            />
          </Field>
          <Field label="Phone">
            <Input
              placeholder="e.g. 9876543210"
              value={createForm.phone}
              onChange={setCreateField('phone')}
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              placeholder="At least 6 characters"
              value={createForm.password}
              onChange={setCreateField('password')}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country code">
              <Input
                placeholder="IN"
                value={createForm.country_code}
                onChange={setCreateField('country_code')}
              />
            </Field>
            <Field label="Initial balance">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={createForm.initial_balance}
                onChange={setCreateField('initial_balance')}
              />
            </Field>
          </div>
        </form>
      </Modal>

      {/* Player profile popup — the full reference player screen */}
      <PlayerProfileModal
        open={!!detail}
        detail={detail}
        loading={detailLoading}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
        onResetPassword={openReset}
        onDuplicateAccounts={openDuplicates}
        onKickOut={kickOut}
        onFreeze={toggleFreeze}
      />

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

      {/* Edit user */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit user"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button form="edit-user-form" type="submit" disabled={actionBusy}>
              {actionBusy ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form id="edit-user-form" onSubmit={submitEdit} className="space-y-4">
          <p className="text-sm text-slate-400">
            Editing{' '}
            <span className="font-semibold text-white">
              {editUser?.full_name || editUser?.username}
            </span>
          </p>
          <Field label="Username">
            <Input
              value={editForm.username}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, username: e.target.value }))
              }
              required
            />
          </Field>
          <Field label="Full name">
            <Input
              value={editForm.full_name}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, full_name: e.target.value }))
              }
              required
            />
          </Field>
          <Field label="Phone">
            <Input
              value={editForm.phone}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, phone: e.target.value }))
              }
              required
            />
          </Field>
          <Field label="Account status">
            <Select
              value={editForm.account_status}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, account_status: e.target.value }))
              }
            >
              <option value="active">active</option>
              <option value="suspended">suspended</option>
              <option value="blocked">blocked</option>
              <option value="inactive">inactive</option>
            </Select>
          </Field>
          <Field label="Fraud score">
            <Input
              type="number"
              min="0"
              max="100"
              value={editForm.fraud_score}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, fraud_score: e.target.value }))
              }
            />
          </Field>
        </form>
      </Modal>

      {/* Reset password */}
      <Modal
        open={!!resetUser}
        onClose={() => setResetUser(null)}
        title="Reset password"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetUser(null)}>
              Cancel
            </Button>
            <Button form="reset-pw-form" type="submit" disabled={actionBusy}>
              {actionBusy ? 'Resetting…' : 'Reset password'}
            </Button>
          </>
        }
      >
        <form id="reset-pw-form" onSubmit={submitReset} className="space-y-4">
          <p className="text-sm text-slate-400">
            Setting a new password for{' '}
            <span className="font-semibold text-white">
              {resetUser?.full_name || resetUser?.username}
            </span>
            . They will need this to sign in.
          </p>
          <Field label="New password">
            <Input
              type="text"
              placeholder="At least 6 characters"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              required
              minLength={6}
            />
          </Field>
        </form>
      </Modal>

      {/* Duplicate accounts */}
      <Modal
        open={!!duplicates}
        onClose={() => setDuplicates(null)}
        title="Duplicate accounts"
        size="lg"
      >
        {duplicatesLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-800/60" />
            ))}
          </div>
        ) : duplicates?.rows?.length ? (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-max text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60">
                  {['ID', 'Username', 'Full Name', 'Phone', 'Signup IP', 'Balance', 'Status', 'Matched on'].map(
                    (h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-300">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {duplicates.rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-3 py-2.5 text-slate-300">{r.id}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-300">{r.username || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-300">{r.full_name || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-300">{r.phone || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-300">{r.signup_ip || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-300">
                      {inr((r.main_balance || 0) + (r.bonus_balance || 0))}
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={r.account_status} /></td>
                    <td className="px-3 py-2.5 text-xs text-amber-400">{r.matched_on?.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No other account shares this player&apos;s IP or phone.
          </p>
        )}
      </Modal>

    </AdminShell>
  );
}
