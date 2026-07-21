'use client';

import { useState } from 'react';
import {
  Gift,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Send,
  Play,
  Pause,
  Users,
  Wallet,
  Percent,
  Ban,
} from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  StatCard,
  Button,
  Modal,
  Field,
  Input,
  Textarea,
  Select,
  toast,
  useAdminData,
  inr,
  fmtDate,
} from '@/components/admin/AdminShell';

// Each bonus type is a distinct money-based engine. The hint tells the admin
// exactly what money event triggers it and what the value is computed from.
const BONUS_TYPES = [
  { value: 'joining', label: 'Joining / Welcome', hint: 'Auto-credited once when a new player registers.' },
  { value: 'deposit', label: 'Deposit match', hint: "Credited when an admin confirms a player's deposit. % is of the deposit." },
  { value: 'referral', label: 'Referral', hint: 'Pays the referrer when someone joins/deposits with their code.' },
  { value: 'game', label: 'Game / Play', hint: 'Rewards gameplay activity. Grant manually or via promo code.' },
  { value: 'cashback', label: 'Cashback', hint: 'Rebates net losses over a period. % is of the loss amount.' },
  { value: 'no_deposit', label: 'No deposit', hint: 'Flat reward not tied to a deposit.' },
  { value: 'free_spins', label: 'Free spins', hint: 'Spins reward — grant manually or via code.' },
  { value: 'loyalty', label: 'Loyalty', hint: 'Tiered / VIP reward, granted manually.' },
  { value: 'reload', label: 'Reload', hint: 'Repeat-deposit top-up bonus.' },
  { value: 'manual', label: 'Manual grant', hint: 'Only ever pushed to a player by an admin.' },
];

const typeMeta = (t) => BONUS_TYPES.find((x) => x.value === t) || { label: t, hint: '' };

const emptyBonus = {
  name: '',
  display_title: '',
  description: '',
  bonus_type: 'joining',
  value_type: 'fixed',
  value_amount: 100,
  min_deposit: 0,
  max_bonus_cap: '',
  referrer_reward: 0,
  wagering_multiplier: 35,
  credit_target: 'bonus',
  status: 'draft',
  claim_method: 'auto',
  promo_code: '',
  per_user_limit: 1,
  total_budget: '',
  bonus_validity_days: 30,
  start_date: '',
  end_date: '',
};

// API sends ISO timestamps; <input type="datetime-local"> wants YYYY-MM-DDTHH:mm.
const toLocalInput = (iso) => (iso ? iso.slice(0, 16) : '');

export default function AdminBonusesPage() {
  const { data: bonuses, loading, reload } = useAdminData('/api/v1/admin/bonuses');
  const { data: stats, reload: reloadStats } = useAdminData('/api/v1/admin/bonuses/stats');
  const [tab, setTab] = useState('campaigns');
  const { data: issued, loading: issuedLoading, reload: reloadIssued } = useAdminData(
    '/api/v1/admin/bonuses/issued',
  );

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyBonus);
  const [busy, setBusy] = useState(false);
  const [granting, setGranting] = useState(null); // the bonus being granted
  const [grant, setGrant] = useState({ userId: '', amount: '', notes: '' });

  const refreshAll = () => {
    reload();
    reloadStats();
    reloadIssued();
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Internal name is required');
      return;
    }
    setBusy(true);
    // Empty strings → null so the backend clears optional numerics/dates.
    const payload = {
      ...form,
      max_bonus_cap: form.max_bonus_cap === '' ? null : form.max_bonus_cap,
      total_budget: form.total_budget === '' ? null : form.total_budget,
      per_user_limit: form.per_user_limit === '' ? null : form.per_user_limit,
      promo_code: form.promo_code?.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
    try {
      if (editing === 'new') {
        await adminApi('/api/v1/admin/bonuses/create', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Bonus created');
      } else {
        await adminApi(`/api/v1/admin/bonuses/${editing}`, { method: 'PATCH', body: JSON.stringify(payload) });
        toast.success('Bonus updated');
      }
      setEditing(null);
      refreshAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (row, status) => {
    try {
      await adminApi(`/api/v1/admin/bonuses/${row.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      toast.success(status === 'active' ? 'Bonus activated' : `Bonus ${status}`);
      reload();
      reloadStats();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const duplicate = async (row) => {
    try {
      await adminApi(`/api/v1/admin/bonuses/${row.id}/duplicate`, { method: 'POST' });
      toast.success('Duplicated as a draft');
      reload();
      reloadStats();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row.display_title || row.name}"? Awarded bonuses keep their history.`)) return;
    try {
      await adminApi(`/api/v1/admin/bonuses/${row.id}`, { method: 'DELETE' });
      toast.success('Bonus deleted');
      refreshAll();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const submitGrant = async (e) => {
    e.preventDefault();
    if (!grant.userId) {
      toast.error('Enter a player user ID');
      return;
    }
    setBusy(true);
    try {
      const res = await adminApi(`/api/v1/admin/bonuses/${granting.id}/grant`, {
        method: 'POST',
        body: JSON.stringify({ userId: grant.userId, amount: grant.amount || null, notes: grant.notes }),
      });
      toast.success(`Granted ${inr(res.amount)} to user #${grant.userId}`);
      setGranting(null);
      setGrant({ userId: '', amount: '', notes: '' });
      refreshAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (row) => {
    if (!window.confirm('Revoke this bonus and claw back any locked funds?')) return;
    try {
      await adminApi(`/api/v1/admin/bonuses/issued/${row.id}/revoke`, { method: 'POST' });
      toast.success('Bonus revoked');
      reloadIssued();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openEdit = (r) => {
    setForm({
      name: r.name,
      display_title: r.display_title || '',
      description: r.description || '',
      bonus_type: r.bonus_type,
      value_type: r.value_type,
      value_amount: r.value_amount,
      min_deposit: r.min_deposit,
      max_bonus_cap: r.max_bonus_cap ?? '',
      referrer_reward: r.referrer_reward ?? 0,
      wagering_multiplier: r.wagering_multiplier,
      credit_target: r.credit_target,
      status: r.status,
      claim_method: r.claim_method,
      promo_code: r.promo_code || '',
      per_user_limit: r.per_user_limit ?? '',
      total_budget: r.total_budget ?? '',
      bonus_validity_days: r.bonus_validity_days ?? 30,
      start_date: toLocalInput(r.start_date),
      end_date: toLocalInput(r.end_date),
    });
    setEditing(r.id);
  };

  const columns = [
    {
      key: 'name',
      label: 'Bonus',
      render: (r) => (
        <div>
          <p className="font-medium text-white">{r.display_title || r.name}</p>
          <p className="text-xs text-slate-500">{r.name}</p>
        </div>
      ),
    },
    {
      key: 'bonus_type',
      label: 'Type',
      render: (r) => <span className="text-slate-300">{typeMeta(r.bonus_type).label}</span>,
      filter: 'select',
      filterLabel: 'Type',
      filterAccessor: (r) => typeMeta(r.bonus_type).label,
    },
    {
      key: 'value_amount',
      label: 'Reward',
      render: (r) => (
        <div>
          <span className="font-medium text-white">
            {r.value_type === 'percentage' ? `${r.value_amount}%` : inr(r.value_amount)}
          </span>
          {r.bonus_type === 'referral' && r.referrer_reward > 0 && (
            <span className="block text-xs text-slate-500">referrer {inr(r.referrer_reward)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'credit_target',
      label: 'Credits',
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
          {r.credit_target === 'main' ? <Wallet className="h-3 w-3" /> : <Gift className="h-3 w-3" />}
          {r.credit_target === 'main' ? 'Main (cash)' : `Bonus · ${r.wagering_multiplier}×`}
        </span>
      ),
    },
    {
      key: 'total_awarded',
      label: 'Awarded',
      render: (r) => (
        <div>
          <span className="text-slate-300">{inr(r.total_awarded)}</span>
          <span className="block text-xs text-slate-500">{r.total_claims} claims</span>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} />, filter: 'select' },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          {r.status === 'active' ? (
            <Button variant="secondary" size="sm" icon={Pause} onClick={() => setStatus(r, 'paused')} title="Pause">
              Pause
            </Button>
          ) : (
            <Button variant="success" size="sm" icon={Play} onClick={() => setStatus(r, 'active')} title="Activate">
              Activate
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={Send} onClick={() => { setGranting(r); setGrant({ userId: '', amount: '', notes: '' }); }} title="Grant to a player">
            Grant
          </Button>
          <Button variant="secondary" size="sm" icon={Pencil} onClick={() => openEdit(r)} title="Edit">
            Edit
          </Button>
          <Button variant="secondary" size="sm" icon={Copy} onClick={() => duplicate(r)} title="Duplicate" />
          <Button variant="secondary" size="sm" icon={Trash2} onClick={() => remove(r)} title="Delete" />
        </div>
      ),
    },
  ];

  const issuedColumns = [
    { key: 'username', label: 'Player', render: (r) => (
      <div>
        <p className="font-medium text-white">{r.username}</p>
        <p className="text-xs text-slate-500">#{r.user_id}</p>
      </div>
    ) },
    { key: 'bonus', label: 'Bonus', render: (r) => <span className="text-slate-300">{r.bonus}</span> },
    { key: 'source', label: 'Source', render: (r) => <span className="capitalize text-slate-400">{r.source}</span>, filter: 'select' },
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-medium text-white">{inr(r.amount)}</span> },
    {
      key: 'wagering',
      label: 'Wagering',
      render: (r) =>
        r.wagering_required > 0 ? (
          <span className="text-xs text-slate-400">
            {inr(r.wagering_completed)} / {inr(r.wagering_required)}
          </span>
        ) : (
          <span className="text-xs text-slate-500">—</span>
        ),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} />, filter: 'select' },
    { key: 'created_at', label: 'Granted', render: (r) => <span className="text-xs text-slate-500">{fmtDate(r.created_at)}</span>, filter: 'date' },
    {
      key: 'actions',
      label: '',
      render: (r) =>
        r.status === 'active' ? (
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" icon={Ban} onClick={() => revoke(r)} title="Revoke & claw back">
              Revoke
            </Button>
          </div>
        ) : null,
    },
  ];

  const isPercent = form.value_type === 'percentage';
  const meta = typeMeta(form.bonus_type);

  return (
    <AdminShell
      title="Bonuses & Promotions"
      subtitle="Fully controllable, money-based bonus engine"
      actions={<Button icon={Plus} onClick={() => { setForm(emptyBonus); setEditing('new'); }}>Add bonus</Button>}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Campaigns" value={stats?.total ?? '—'} icon={Gift} accent="brand" />
        <StatCard label="Active now" value={stats?.active ?? '—'} icon={Play} accent="emerald" />
        <StatCard label="Total awarded" value={stats ? inr(stats.total_awarded) : '—'} icon={Wallet} accent="sky" />
        <StatCard label="Total claims" value={stats?.total_claims ?? '—'} icon={Users} accent="rose" />
      </div>

      <div className="mb-4 flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1 w-fit">
        {[
          ['campaigns', 'Campaigns'],
          ['issued', 'Issued bonuses'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'campaigns' ? (
        <DataTable
          columns={columns}
          rows={bonuses}
          loading={loading}
          searchable
          searchKeys={['name', 'display_title', 'bonus_type']}
          searchPlaceholder="Search bonuses…"
          noun="bonus"
          emptyIcon={Gift}
          emptyMessage="No bonuses configured"
        />
      ) : (
        <DataTable
          columns={issuedColumns}
          rows={issued}
          loading={issuedLoading}
          searchable
          searchKeys={['username', 'bonus', 'source']}
          searchPlaceholder="Search issued bonuses…"
          noun="issued bonus"
          emptyIcon={Wallet}
          emptyMessage="No bonuses have been awarded yet"
        />
      )}

      {/* --- Deep control editor --- */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add bonus' : 'Edit bonus'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button form="bonus-form" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save bonus'}</Button>
          </>
        }
      >
        <form id="bonus-form" onSubmit={save} className="grid gap-5">
          {/* Basics */}
          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Internal name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="welcome100" required />
            </Field>
            <Field label="Display title (shown to players)">
              <Input value={form.display_title} onChange={(e) => setForm({ ...form, display_title: e.target.value })} placeholder="Welcome Bonus ₹100" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Shown on the promotions page." />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Bonus type">
                <Select value={form.bonus_type} onChange={(e) => setForm({ ...form, bonus_type: e.target.value })}>
                  {BONUS_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </Field>
              {meta.hint && <p className="mt-1.5 text-xs text-indigo-300/80">{meta.hint}</p>}
            </div>
          </section>

          <hr className="border-slate-800" />

          {/* Reward & money */}
          <section>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Percent className="h-3.5 w-3.5" /> Reward &amp; money
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Value type">
                <Select value={form.value_type} onChange={(e) => setForm({ ...form, value_type: e.target.value })}>
                  <option value="fixed">Fixed (₹)</option>
                  <option value="percentage">Percentage (%)</option>
                </Select>
              </Field>
              <Field label={isPercent ? 'Percentage' : 'Amount (₹)'}>
                <Input type="number" step="0.01" value={form.value_amount} onChange={(e) => setForm({ ...form, value_amount: e.target.value })} />
              </Field>
              <Field label="Min deposit / qualifying amount (₹)">
                <Input type="number" step="0.01" value={form.min_deposit} onChange={(e) => setForm({ ...form, min_deposit: e.target.value })} />
              </Field>
              <Field label="Max bonus cap (₹, blank = no cap)">
                <Input type="number" step="0.01" value={form.max_bonus_cap} onChange={(e) => setForm({ ...form, max_bonus_cap: e.target.value })} placeholder="No cap" />
              </Field>
              {form.bonus_type === 'referral' && (
                <Field label="Referrer reward (₹)">
                  <Input type="number" step="0.01" value={form.referrer_reward} onChange={(e) => setForm({ ...form, referrer_reward: e.target.value })} />
                </Field>
              )}
              <Field label="Credits to">
                <Select value={form.credit_target} onChange={(e) => setForm({ ...form, credit_target: e.target.value })}>
                  <option value="bonus">Bonus balance (locked, needs wagering)</option>
                  <option value="main">Main balance (instantly withdrawable)</option>
                </Select>
              </Field>
              {form.credit_target === 'bonus' && (
                <Field label="Wagering multiplier (×)">
                  <Input type="number" step="0.5" value={form.wagering_multiplier} onChange={(e) => setForm({ ...form, wagering_multiplier: e.target.value })} />
                </Field>
              )}
            </div>
          </section>

          <hr className="border-slate-800" />

          {/* Limits & budget */}
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Limits &amp; budget</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Max per user (blank = unlimited)">
                <Input type="number" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} placeholder="Unlimited" />
              </Field>
              <Field label="Total budget cap (₹, blank = uncapped)">
                <Input type="number" step="0.01" value={form.total_budget} onChange={(e) => setForm({ ...form, total_budget: e.target.value })} placeholder="Uncapped" />
              </Field>
              <Field label="Bonus validity (days)">
                <Input type="number" value={form.bonus_validity_days} onChange={(e) => setForm({ ...form, bonus_validity_days: e.target.value })} />
              </Field>
              <Field label="Claim method">
                <Select value={form.claim_method} onChange={(e) => setForm({ ...form, claim_method: e.target.value })}>
                  <option value="auto">Automatic (fires on its trigger)</option>
                  <option value="manual">Manual (admin grants it)</option>
                  <option value="code">Promo code</option>
                  <option value="opt_in">Opt-in</option>
                </Select>
              </Field>
              {(form.claim_method === 'code' || form.promo_code) && (
                <Field label="Promo code">
                  <Input value={form.promo_code} onChange={(e) => setForm({ ...form, promo_code: e.target.value.toUpperCase() })} placeholder="WELCOME100" />
                </Field>
              )}
            </div>
          </section>

          <hr className="border-slate-800" />

          {/* Schedule & status */}
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Schedule &amp; status</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts (blank = immediately)">
                <Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </Field>
              <Field label="Ends (blank = never)">
                <Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Status">
                  <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="draft">Draft (hidden, not firing)</option>
                    <option value="active">Active (live)</option>
                    <option value="paused">Paused (temporarily off)</option>
                    <option value="expired">Expired</option>
                  </Select>
                </Field>
              </div>
            </div>
          </section>
        </form>
      </Modal>

      {/* --- Manual grant --- */}
      <Modal
        open={!!granting}
        onClose={() => setGranting(null)}
        title={granting ? `Grant "${granting.display_title || granting.name}"` : 'Grant bonus'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setGranting(null)}>Cancel</Button>
            <Button form="grant-form" type="submit" disabled={busy}>{busy ? 'Granting…' : 'Grant bonus'}</Button>
          </>
        }
      >
        <form id="grant-form" onSubmit={submitGrant} className="grid gap-4">
          <p className="text-sm text-slate-400">
            Pushes this bonus straight to a player's wallet, honoring its credit target and wagering rules.
          </p>
          <Field label="Player user ID">
            <Input type="number" value={grant.userId} onChange={(e) => setGrant({ ...grant, userId: e.target.value })} placeholder="e.g. 42" required />
          </Field>
          <Field label="Amount override (₹, blank = the bonus's configured value)">
            <Input type="number" step="0.01" value={grant.amount} onChange={(e) => setGrant({ ...grant, amount: e.target.value })} placeholder={granting ? String(granting.value_amount) : ''} />
          </Field>
          <Field label="Note (optional)">
            <Input value={grant.notes} onChange={(e) => setGrant({ ...grant, notes: e.target.value })} placeholder="Reason / campaign" />
          </Field>
        </form>
      </Modal>
    </AdminShell>
  );
}
