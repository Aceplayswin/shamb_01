'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, User, SlidersHorizontal, Network, Users,
  ArrowLeftRight, Scale, Activity, KeyRound, Loader2,
} from 'lucide-react';
import {
  AdminShell,
  StatusBadge,
  Button,
  DataTable,
  Modal,
  ErrorState,
  confirmDialog,
  toast,
  fmtDate,
  inr,
  Field,
  Input,
  Select,
  Toggle,
  useAdminData,
} from '@/components/admin/AdminShell';
import { LevelBadge } from '@/components/admin/AgentLevel';
import { adminApi } from '@/services/adminApi';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'terms', label: 'Terms & Position', icon: SlidersHorizontal },
  { id: 'downline', label: 'Downline', icon: Network },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
  { id: 'settlements', label: 'Settlements', icon: Scale },
  { id: 'activity', label: 'Activity Log', icon: Activity },
];

/** Signed from the agent's own side: down is credit leaving them. */
function SignedAmount({ row }) {
  const out = row.direction === 'down';
  return (
    <span className={out ? 'font-semibold text-rose-400' : 'font-semibold text-emerald-400'}>
      {out ? '−' : '+'}{inr(row.amount)}
    </span>
  );
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [busy, setBusy] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState('');

  const { data, loading, error, reload } = useAdminData(
    `/api/v1/admin/agents/${params.id}`,
    [params.id],
  );
  // Needed by the Terms tab to reparent, which is the one edit that has to know
  // about accounts other than this one.
  const { data: agents } = useAdminData('/api/v1/admin/agents?limit=500', []);

  const handleSuspend = async () => {
    const isSuspending = data.status === 'active';
    const ok = await confirmDialog({
      title: `${isSuspending ? 'Suspend' : 'Reactivate'} agent?`,
      text: isSuspending
        ? `${data.name} is signed out and neither they nor their downline can place new bets.`
        : `${data.name} regains access to the panel.`,
      confirmText: isSuspending ? 'Suspend' : 'Reactivate',
      danger: isSuspending,
    });
    if (!ok) return;

    try {
      await adminApi(`/api/v1/admin/agents/${params.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: isSuspending ? 'suspended' : 'active' }),
      });
      toast.success(`Agent ${isSuspending ? 'suspended' : 'reactivated'}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: 'Delete agent?',
      text: `This permanently removes ${data.name} along with their transfer, `
        + 'settlement and audit history. It is refused while they hold a balance, '
        + 'carry open exposure, or have any downline left.',
      confirmText: 'Delete permanently',
      danger: true,
    });
    if (!ok) return;

    try {
      await adminApi(`/api/v1/admin/agents/${params.id}`, { method: 'DELETE' });
      toast.success('Agent deleted');
      router.push('/agents');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi(`/api/v1/admin/agents/${params.id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      toast.success('Password reset — they must change it at next sign-in');
      setPasswordOpen(false);
      setPassword('');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveTerms = async (terms) => {
    setBusy(true);
    try {
      await adminApi(`/api/v1/admin/agents/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(terms),
      });
      toast.success('Agent updated');
      reload();
    } catch (err) {
      // The API refuses a reparent that would loop the tree, and a level that
      // does not sit below the chosen parent.
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <AdminShell title="Agent">
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        </div>
      </AdminShell>
    );
  }

  if (error || !data) {
    return (
      <AdminShell title="Agent">
        <ErrorState message={error || 'Agent not found'} onRetry={reload} />
      </AdminShell>
    );
  }

  return (
    // AdminShell carries the console's auth guard, so this route is not
    // reachable by anyone who merely knows the URL.
    <AdminShell title={data.name} subtitle={`${data.code} · ${data.level_label}`}>
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/agents" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            {data.name}
            <StatusBadge status={data.status} />
            <LevelBadge level={data.level} label={data.level_label} />
          </h1>
          <p className="text-slate-400">
            {data.username || data.code}
            {data.email && ` • ${data.email}`}
            {data.parent_name ? ` • under ${data.parent_name}` : ' • root account'}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" icon={KeyRound} onClick={() => setPasswordOpen(true)}>
            Reset password
          </Button>
          <Button variant="secondary" onClick={handleSuspend}>
            {data.status === 'active' ? 'Suspend' : 'Reactivate'}
          </Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <div className="hide-scrollbar flex overflow-x-auto border-b border-slate-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Account</h3>
              <div className="space-y-2 rounded-lg bg-slate-950 p-4">
                <p className="text-sm"><span className="text-slate-500">Username:</span> <span className="text-slate-200">{data.username || '—'}</span></p>
                <p className="text-sm"><span className="text-slate-500">Code:</span> <span className="font-mono text-slate-200">{data.code}</span></p>
                <p className="text-sm"><span className="text-slate-500">Email:</span> <span className="text-slate-200">{data.email || '—'}</span></p>
                <p className="text-sm"><span className="text-slate-500">Phone:</span> <span className="text-slate-200">{data.phone || '—'}</span></p>
                <p className="text-sm"><span className="text-slate-500">Tree depth:</span> <span className="text-slate-200">Level {data.depth}</span></p>
                <p className="text-sm"><span className="text-slate-500">Joined:</span> <span className="text-slate-200">{fmtDate(data.joined_at)}</span></p>
                <p className="text-sm"><span className="text-slate-500">Last sign-in:</span> <span className="text-slate-200">{fmtDate(data.last_login_at)}</span></p>
              </div>

              <h3 className="mt-6 font-semibold text-white">Restrictions</h3>
              <div className="space-y-2 rounded-lg bg-slate-950 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Betting</span>
                  <span className={data.bet_locked ? 'text-rose-400' : 'text-emerald-400'}>
                    {data.bet_locked ? 'Locked' : 'Open'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Downline logins</span>
                  <span className={data.user_locked ? 'text-rose-400' : 'text-emerald-400'}>
                    {data.user_locked ? 'Locked' : 'Open'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Password change pending</span>
                  <span className={data.must_change_password ? 'text-amber-400' : 'text-slate-400'}>
                    {data.must_change_password ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-white">Credit &amp; exposure</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">Balance</p>
                  <p className="text-xl font-bold text-white">{inr(data.balance)}</p>
                </div>
                <div className="rounded-lg bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">Free of open bets</p>
                  <p className="text-xl font-bold text-white">{inr(data.available_credit)}</p>
                </div>
                <div className="rounded-lg bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">Own exposure</p>
                  <p className="text-xl font-bold text-white">{inr(data.exposure)}</p>
                </div>
                {/* Own exposure plus everything the subtree is carrying — what
                    this account is actually on the hook for. */}
                <div className="rounded-lg border border-amber-500/20 bg-slate-950 p-4">
                  <p className="text-xs text-amber-500">Net exposure</p>
                  <p className="text-xl font-bold text-amber-400">{inr(data.stats.net_exposure)}</p>
                </div>
                <div className="rounded-lg bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">Settled P&amp;L</p>
                  <p className="text-xl font-bold text-white">{inr(data.settled_pl)}</p>
                </div>
                <div className="rounded-lg bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">Unsettled P&amp;L</p>
                  <p className="text-xl font-bold text-white">{inr(data.unsettled_pl)}</p>
                </div>
              </div>

              <h3 className="mt-6 font-semibold text-white">Network</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">Direct</p>
                  <p className="text-xl font-bold text-white">{data.stats.direct_children}</p>
                </div>
                <div className="rounded-lg bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">Whole subtree</p>
                  <p className="text-xl font-bold text-white">{data.stats.downline_agents}</p>
                </div>
                <div className="rounded-lg bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">Players</p>
                  <p className="text-xl font-bold text-white">{data.stats.downline_players}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'terms' && (
          <TermsTab
            data={data}
            agents={agents?.records ?? []}
            levels={agents?.levels ?? []}
            onSave={saveTerms}
            busy={busy}
          />
        )}

        {activeTab === 'downline' && (
          <DataTable
            columns={[
              { key: 'name', label: 'Agent', render: (r) => (
                <Link href={`/agents/${r.id}`} className="font-medium text-blue-400 hover:underline">
                  {r.name}
                  <span className="ml-2 text-xs text-slate-500">{r.username || r.code}</span>
                </Link>
              )},
              { key: 'level', label: 'Level', render: (r) => <LevelBadge level={r.level} label={r.level_label} /> },
              { key: 'partnership', label: 'Partnership', render: (r) => <span className="text-slate-300">{r.partnership}%</span> },
              { key: 'balance', label: 'Balance', render: (r) => <span className="font-semibold text-white">{inr(r.balance)}</span> },
              { key: 'exposure', label: 'Exposure', render: (r) => <span className="text-slate-400">{inr(r.exposure)}</span> },
              { key: 'players', label: 'Players', render: (r) => <span className="text-slate-300">{r.players}</span> },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={data.downline}
            noun="account"
            emptyIcon={Network}
            emptyMessage="No downline accounts"
            emptyHint="Accounts this agent opens itself appear here."
          />
        )}

        {activeTab === 'players' && (
          <DataTable
            columns={[
              { key: 'username', label: 'Player', render: (r) => <span className="font-medium text-white">{r.username}</span> },
              { key: 'name', label: 'Name', render: (r) => <span className="text-slate-400">{r.name || '—'}</span> },
              { key: 'balance', label: 'Wallet', render: (r) => <span className="font-semibold text-emerald-400">{inr(r.balance)}</span> },
              { key: 'exposure', label: 'Exposure', render: (r) => <span className="text-slate-400">{inr(r.exposure)}</span> },
              { key: 'joined_at', label: 'Joined', render: (r) => fmtDate(r.joined_at) },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={data.players}
            noun="player"
            emptyIcon={Users}
            emptyMessage="No players on this account"
            emptyHint="Players sitting further down the tree belong to the account that opened them."
          />
        )}

        {activeTab === 'transfers' && (
          <DataTable
            columns={[
              { key: 'created_at', label: 'When', render: (r) => fmtDate(r.created_at) },
              { key: 'counterparty', label: 'Counterparty', render: (r) => (
                r.is_platform ? (
                  <span className="rounded bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-400">
                    Platform
                  </span>
                ) : (
                  <div>
                    <span className="text-slate-200">{r.counterparty}</span>
                    <p className="text-xs capitalize text-slate-500">{r.counterparty_type}</p>
                  </div>
                )
              )},
              { key: 'amount', label: 'Amount', render: (r) => <SignedAmount row={r} /> },
              { key: 'balance_after', label: 'Balance after', render: (r) => <span className="text-slate-300">{inr(r.balance_after)}</span> },
              { key: 'remark', label: 'Remark', render: (r) => <span className="text-sm text-slate-400">{r.remark}</span> },
            ]}
            rows={data.transfers}
            noun="transfer"
            emptyIcon={ArrowLeftRight}
            emptyMessage="No credit movements yet"
          />
        )}

        {activeTab === 'settlements' && (
          <DataTable
            columns={[
              { key: 'created_at', label: 'When', render: (r) => fmtDate(r.created_at) },
              { key: 'counterparty', label: 'Counterparty', render: (r) => (
                <div>
                  <span className="text-slate-200">{r.counterparty}</span>
                  <p className="text-xs capitalize text-slate-500">{r.counterparty_type}</p>
                </div>
              )},
              { key: 'period_start', label: 'Period', render: (r) => (
                <span className="text-slate-400">
                  {r.period_start ? `${r.period_start} → ${r.period_end}` : '—'}
                </span>
              )},
              { key: 'amount', label: 'Settled', render: (r) => (
                <span className={r.amount >= 0 ? 'font-semibold text-emerald-400' : 'font-semibold text-rose-400'}>
                  {inr(r.amount)}
                </span>
              )},
              { key: 'pl_after', label: 'P&L after', render: (r) => <span className="text-slate-300">{inr(r.pl_after)}</span> },
              { key: 'note', label: 'Note', render: (r) => <span className="text-sm text-slate-400">{r.note}</span> },
            ]}
            rows={data.settlements}
            noun="settlement"
            emptyIcon={Scale}
            emptyMessage="Nothing settled yet"
          />
        )}

        {activeTab === 'activity' && (
          <DataTable
            columns={[
              { key: 'created_at', label: 'Time', render: (r) => fmtDate(r.created_at) },
              { key: 'actor_label', label: 'Actor', render: (r) => (
                <span className="text-slate-300">{r.actor_label || '—'}</span>
              )},
              { key: 'action', label: 'Action', render: (r) => <span className="text-white">{r.action}</span> },
              { key: 'target_type', label: 'Target', render: (r) => (
                <span className="text-sm text-amber-400">
                  {r.target_type ? `${r.target_type}:${r.target_id}` : '—'}
                </span>
              )},
              { key: 'ip', label: 'IP Address', render: (r) => <span className="font-mono text-xs text-slate-400">{r.ip || '—'}</span> },
            ]}
            rows={data.activity_log}
            noun="entry"
            emptyIcon={Activity}
            emptyMessage="No activity recorded yet"
          />
        )}
      </div>
    </div>

    <Modal
      open={passwordOpen}
      onClose={() => setPasswordOpen(false)}
      title="Reset password"
      footer={
        <>
          <Button variant="secondary" onClick={() => setPasswordOpen(false)}>Cancel</Button>
          <Button form="password-form" type="submit" busy={busy}>Reset password</Button>
        </>
      }
    >
      <form id="password-form" onSubmit={submitPassword} className="space-y-4">
        <p className="text-sm text-slate-400">
          {data.name} is forced to choose their own password at the next sign-in —
          an account whose password someone else picked is not an audit identity
          until its owner has replaced it.
        </p>
        <Field label="Temporary password">
          <Input
            type="text"
            required
            minLength={6}
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
    </AdminShell>
  );
}

/**
 * Commercial terms, locks, and where the account sits in the tree.
 *
 * Reparenting is the one edit here with consequences beyond this row: it
 * restamps the whole subtree's `tree_path`, which is what every scoped report
 * reads. The server refuses a move that would create a loop.
 */
function TermsTab({ data, agents, levels, onSave, busy }) {
  const [terms, setTerms] = useState({
    name: data.name,
    contactEmail: data.email ?? '',
    contactPhone: data.phone ?? '',
    level: data.level,
    partnership: data.partnership,
    commissionRate: data.commission_rate,
    parentAgentId: data.parent_agent_id ?? '',
    betLocked: data.bet_locked,
    userLocked: data.user_locked,
  });

  const set = (key) => (e) => setTerms({ ...terms, [key]: e.target.value });

  // Anything in this agent's own subtree would create a loop, so it is not
  // offered — the server refuses it too, but a dropdown that lists impossible
  // choices is a worse way to find that out.
  const subtreePrefix = data.tree_path || `/${data.id}/`;
  const candidates = agents.filter(
    (a) => a.id !== data.id && !(a.tree_path ?? '').startsWith(subtreePrefix),
  );

  const selectedParent = candidates.find(
    (p) => String(p.id) === String(terms.parentAgentId),
  );
  const parentIndex = selectedParent
    ? levels.findIndex((l) => l.value === selectedParent.level)
    : -1;
  const allowedLevels = selectedParent
    ? (parentIndex < 0 ? [] : levels.slice(parentIndex + 1))
    : levels;

  return (
    <form
      className="max-w-2xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(terms);
      }}
    >
      <div>
        <h3 className="font-semibold text-white">Commercial terms</h3>
        <p className="mb-4 text-sm text-slate-400">
          Partnership is this agent&apos;s share of the P&amp;L their downline
          generates. Changes apply to future settlement; what has already been
          settled is not recalculated.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Partnership (%)">
            <Input type="number" min="0" max="100" step="0.5" value={terms.partnership} onChange={set('partnership')} />
          </Field>
          <Field label="Commission (%)">
            <Input type="number" min="0" max="100" step="0.5" value={terms.commissionRate} onChange={set('commissionRate')} />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-white">Position in the tree</h3>
        <p className="mb-4 text-sm text-slate-400">
          Moving an account moves everything beneath it. A move that would put
          this agent below one of its own downline is refused.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Upline">
            <Select
              value={terms.parentAgentId}
              onChange={(e) => setTerms({ ...terms, parentAgentId: e.target.value, level: '' })}
            >
              <option value="">None — root of the tree</option>
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.level_label})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Level">
            <Select required value={terms.level} onChange={set('level')}>
              <option value="">Choose a level…</option>
              {allowedLevels.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-white">Contact</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <Input value={terms.name} onChange={set('name')} />
          </Field>
          <Field label="Email">
            <Input type="email" value={terms.contactEmail} onChange={set('contactEmail')} />
          </Field>
          <Field label="Phone">
            <Input value={terms.contactPhone} onChange={set('contactPhone')} />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-semibold text-white">Restrictions</h3>
        <div className="space-y-4">
          <div>
            <Toggle
              checked={Boolean(terms.betLocked)}
              onChange={(v) => setTerms({ ...terms, betLocked: v })}
              label="Lock betting"
            />
            <p className="mt-1 text-xs text-slate-500">
              Stops new bets across this account and everything below it. Open
              bets still settle normally.
            </p>
          </div>
          <div>
            <Toggle
              checked={Boolean(terms.userLocked)}
              onChange={(v) => setTerms({ ...terms, userLocked: v })}
              label="Lock downline logins"
            />
            <p className="mt-1 text-xs text-slate-500">
              Keeps the account itself signed in while shutting its downline out.
            </p>
          </div>
        </div>
      </div>

      <Button type="submit" busy={busy}>Save changes</Button>
    </form>
  );
}
