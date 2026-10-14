'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, User, FileText, DollarSign, Users,
  List, CreditCard, Key, Activity, Loader2,
} from 'lucide-react';
import {
  AdminShell,
  StatusBadge,
  Button,
  DataTable,
  ErrorState,
  confirmDialog,
  toast,
  fmtDate,
  inr,
  Field,
  Input,
  Select,
  useAdminData,
} from '@/components/admin/AdminShell';
import { adminApi } from '@/services/adminApi';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'kyc', label: 'KYC Docs', icon: FileText },
  { id: 'commission', label: 'Commission', icon: DollarSign },
  { id: 'users', label: 'Referred Users', icon: Users },
  { id: 'ledger', label: 'Ledger', icon: List },
  { id: 'payouts', label: 'Payout History', icon: CreditCard },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'activity', label: 'Activity Log', icon: Activity },
];

export default function AffiliateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [busy, setBusy] = useState(false);

  // `params.id` was read and then thrown away — every id rendered the same
  // hardcoded record. It drives the request now.
  const { data, loading, error, reload } = useAdminData(
    `/api/v1/admin/affiliates/${params.id}`,
    [params.id],
  );

  const handleSuspend = async () => {
    const isSuspending = data.status === 'approved';
    const ok = await confirmDialog({
      title: `${isSuspending ? 'Suspend' : 'Reactivate'} affiliate?`,
      text: isSuspending
        ? `${data.name} loses access and their links stop attributing new signups.`
        : `${data.name} regains access.`,
      confirmText: isSuspending ? 'Suspend' : 'Reactivate',
      danger: isSuspending,
    });
    if (!ok) return;

    try {
      await adminApi(`/api/v1/admin/affiliates/${params.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: isSuspending ? 'suspended' : 'approved' }),
      });
      toast.success(`Affiliate ${isSuspending ? 'suspended' : 'reactivated'}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: 'Delete affiliate?',
      text: `This permanently removes ${data.name} along with their links, referrals `
        + 'and ledger. It is refused while they are owed unpaid commission.',
      confirmText: 'Delete permanently',
      danger: true,
    });
    if (!ok) return;

    try {
      await adminApi(`/api/v1/admin/affiliates/${params.id}`, { method: 'DELETE' });
      toast.success('Affiliate deleted');
      router.push('/affiliates');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const reviewDoc = async (docId, status) => {
    let reason = null;
    if (status === 'rejected') {
      reason = window.prompt('Why is this document being rejected? The affiliate sees this.');
      if (!reason) return;
    }

    try {
      await adminApi(
        `/api/v1/admin/affiliates/${params.id}/kyc/${docId}/review`,
        { method: 'POST', body: JSON.stringify({ status, reason }) },
      );
      toast.success(`Document ${status}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRevokeKey = async (keyId) => {
    const ok = await confirmDialog({
      title: 'Revoke API key?',
      text: 'Any integration signing with it stops working on the next request. '
        + 'There is no grace period.',
      confirmText: 'Revoke key',
      danger: true,
    });
    if (!ok) return;

    try {
      await adminApi(
        `/api/v1/admin/affiliates/${params.id}/api-keys/${keyId}/revoke`,
        { method: 'POST' },
      );
      toast.success('Key revoked');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const approveEntry = async (entryId) => {
    try {
      await adminApi(`/api/v1/admin/affiliates/ledger/${entryId}/approve`, {
        method: 'POST',
      });
      toast.success('Entry approved — the affiliate can now withdraw it');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const clawbackEntry = async (entryId) => {
    const reason = window.prompt('Why is this commission being reversed?');
    if (!reason) return;
    try {
      // Writes a compensating negative entry rather than editing the original,
      // so the ledger keeps the record of what happened.
      await adminApi(`/api/v1/admin/affiliates/ledger/${entryId}/clawback`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      toast.success('Commission clawed back');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saveCommission = async (terms) => {
    setBusy(true);
    try {
      await adminApi(`/api/v1/admin/affiliates/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(terms),
      });
      toast.success('Commission terms updated');
      reload();
    } catch (err) {
      // The API refuses a parent reassignment that would loop the network.
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <AdminShell title="Affiliate">
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        </div>
      </AdminShell>
    );
  }

  if (error || !data) {
    return (
      <AdminShell title="Affiliate">
        <ErrorState message={error || 'Affiliate not found'} onRetry={reload} />
      </AdminShell>
    );
  }

  return (
    // AdminShell carries the console's auth guard. Without it this route was
    // reachable by anyone who knew the URL, unlike every other admin page.
    <AdminShell title={data.name} subtitle={`${data.code} · ${data.tier_label} tier`}>
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/affiliates" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {data.name}
            <StatusBadge status={data.status} />
          </h1>
          <p className="text-slate-400">
            {data.company_name || 'Individual'} • {data.email}
            {data.parent_name && ` • recruited by ${data.parent_name}`}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={handleSuspend}>
            {data.status === 'approved' ? 'Suspend' : 'Reactivate'}
          </Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-800 hide-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Contact Information</h3>
              <div className="bg-slate-950 p-4 rounded-lg space-y-2">
                <p className="text-sm"><span className="text-slate-500">Email:</span> <span className="text-slate-200">{data.email}</span></p>
                <p className="text-sm"><span className="text-slate-500">Phone:</span> <span className="text-slate-200">{data.phone || '—'}</span></p>
                <p className="text-sm"><span className="text-slate-500">Tier:</span> <span className="font-medium text-amber-400">{data.tier_label}</span></p>
                <p className="text-sm"><span className="text-slate-500">Network depth:</span> <span className="text-slate-200">Level {data.commission_tier}</span></p>
                <p className="text-sm"><span className="text-slate-500">Joined:</span> <span className="text-slate-200">{fmtDate(data.joined_at)}</span></p>
              </div>
              {/* A list, not a single method — an affiliate can register several. */}
              <h3 className="mt-6 font-semibold text-white">Payout Methods</h3>
              <div className="space-y-2 rounded-lg bg-slate-950 p-4">
                {data.payout_methods.length === 0 && (
                  <p className="text-sm text-slate-500">None registered yet.</p>
                )}
                {data.payout_methods.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <span className="text-slate-200">{m.label || m.method_type.toUpperCase()}</span>
                      <span className="ml-2 font-mono text-xs text-slate-500">{m.masked_details}</span>
                    </div>
                    {m.is_primary && (
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Performance Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-lg">
                  <p className="text-xs text-slate-500">Total Players</p>
                  <p className="text-xl font-bold text-white">{data.stats.signups.toLocaleString()}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg">
                  <p className="text-xs text-slate-500">Total FTDs</p>
                  <p className="text-xl font-bold text-white">{data.stats.ftds.toLocaleString()}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg">
                  <p className="text-xs text-slate-500">Total Deposits</p>
                  <p className="text-xl font-bold text-white">{inr(data.stats.total_deposits)}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-emerald-500/20">
                  <p className="text-xs text-emerald-500">Total Earnings</p>
                  <p className="text-xl font-bold text-emerald-400">{inr(data.stats.total_earnings)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kyc' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-white mb-4">KYC Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.kyc_documents.map(doc => (
                <div key={doc.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-medium text-slate-200">{doc.type}</p>
                      <p className="text-xs text-slate-500">{fmtDate(doc.uploaded_at)}</p>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                  <div className="h-32 bg-slate-900 rounded flex items-center justify-center text-slate-500 text-sm mb-4 border border-dashed border-slate-700">
                    {/* Placeholder for document preview */}
                    Document Preview
                  </div>
                  {doc.status === 'pending' && (
                    <div className="flex gap-2 mt-auto">
                      <Button variant="success" size="sm" className="flex-1" onClick={() => reviewDoc(doc.id, 'approved')}>Approve</Button>
                      <Button variant="danger" size="sm" className="flex-1" onClick={() => reviewDoc(doc.id, 'rejected')}>Reject</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'commission' && (
          <CommissionTab data={data} onSave={saveCommission} busy={busy} />
        )}

        {activeTab === 'users' && (
          <DataTable
            columns={[
              { key: 'player_ref', label: 'Player', render: (r) => <span className="font-medium text-white">{r.player_ref}</span> },
              { key: 'signed_up_at', label: 'Signed Up', render: (r) => fmtDate(r.signed_up_at) },
              { key: 'ftd_at', label: 'First Deposit', render: (r) => (r.ftd_at ? fmtDate(r.ftd_at) : <span className="text-slate-600">—</span>) },
              { key: 'lifetime_deposits', label: 'Deposits', render: (r) => <span className="text-emerald-400">{inr(r.lifetime_deposits)}</span> },
              { key: 'lifetime_commission', label: 'Commission', render: (r) => <span className="text-slate-300">{inr(r.lifetime_commission)}</span> },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={data.referred_users}
          />
        )}

        {activeTab === 'ledger' && (
          <DataTable
            columns={[
              { key: 'period_start', label: 'Period', render: (r) => <span className="font-medium text-white">{r.period_start}</span> },
              { key: 'entry_type', label: 'Type', render: (r) => (
                <div>
                  <span className="capitalize text-slate-300">{r.entry_type.replace(/_/g, ' ')}</span>
                  {r.source_affiliate_name && (
                    <p className="text-xs text-slate-500">from {r.source_affiliate_name}</p>
                  )}
                </div>
              )},
              { key: 'base_label', label: 'Base', render: (r) => <span className="text-slate-400">{r.base_label}</span> },
              { key: 'rate', label: 'Rate', render: (r) => <span className="text-amber-400">{r.rate > 0 ? `${r.rate}%` : '—'}</span> },
              { key: 'amount', label: 'Earned', render: (r) => <span className="font-bold text-emerald-400">{inr(r.amount)}</span> },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'ledger_actions', label: '', render: (r) => (
                <div className="flex justify-end gap-1.5">
                  {r.status === 'pending' && (
                    <Button variant="secondary" size="sm" onClick={() => approveEntry(r.id)}>Approve</Button>
                  )}
                  {(r.status === 'pending' || r.status === 'approved') && (
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-rose-400" onClick={() => clawbackEntry(r.id)}>
                      Claw back
                    </Button>
                  )}
                </div>
              )},
            ]}
            rows={data.commission_ledger}
          />
        )}

        {activeTab === 'payouts' && (
          <DataTable
            columns={[
              { key: 'requested_at', label: 'Requested', render: (r) => fmtDate(r.requested_at) },
              { key: 'processed_at', label: 'Processed', render: (r) => (r.processed_at ? fmtDate(r.processed_at) : <span className="text-slate-600">—</span>) },
              { key: 'amount', label: 'Amount', render: (r) => <span className="font-bold text-emerald-400">{inr(r.amount)}</span> },
              { key: 'method_label', label: 'Method', render: (r) => <span className="text-slate-300">{r.method_label}</span> },
              { key: 'reference', label: 'Reference', render: (r) => <span className="font-mono text-xs text-slate-500">{r.reference || '—'}</span> },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={data.payout_history}
          />
        )}

        {activeTab === 'api' && (
          <DataTable
            columns={[
              { key: 'key_id', label: 'Key ID', render: (r) => <span className="rounded bg-slate-950 px-2 py-1 font-mono text-slate-300">{r.key_id}</span> },
              { key: 'created_at', label: 'Created', render: (r) => fmtDate(r.created_at) },
              { key: 'last_used_at', label: 'Last Used', render: (r) => fmtDate(r.last_used_at) },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'actions', label: '', render: (r) => (
                <div className="flex justify-end">
                  {r.status !== 'revoked' && (
                    <Button variant="danger" size="sm" onClick={() => handleRevokeKey(r.id)}>Revoke</Button>
                  )}
                </div>
              )}
            ]}
            rows={data.api_keys}
          />
        )}

        {activeTab === 'activity' && (
          <DataTable
            columns={[
              { key: 'created_at', label: 'Time', render: (r) => fmtDate(r.created_at) },
              { key: 'actor_label', label: 'Actor', render: (r) => (
                <span className="capitalize text-slate-300">{r.actor_label || r.actor_type}</span>
              )},
              { key: 'action', label: 'Action', render: (r) => <span className="text-white">{r.action}</span> },
              { key: 'target', label: 'Target', render: (r) => <span className="text-sm text-amber-400">{r.target || '—'}</span> },
              { key: 'ip', label: 'IP Address', render: (r) => <span className="font-mono text-xs text-slate-400">{r.ip || '—'}</span> },
            ]}
            rows={data.activity_log}
          />
        )}
      </div>
    </div>
    </AdminShell>
  );
}

/**
 * Per-affiliate commercial terms.
 *
 * Zero means "inherit the programme default", which is why the placeholders
 * show what those defaults currently are rather than leaving the field blank.
 */
function CommissionTab({ data, onSave, busy }) {
  const [terms, setTerms] = useState({
    commissionType: data.commission_type,
    commissionRate: data.commission_rate,
    cpaAmount: data.cpa_amount,
    overrideRate: data.override_rate,
    tierLabel: data.tier_label,
    payoutThreshold: data.payout_threshold,
    parentAffiliateId: data.parent_affiliate_id ?? '',
  });

  const set = (key) => (e) => setTerms({ ...terms, [key]: e.target.value });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="font-semibold text-white">Commission terms</h3>
        <p className="mb-4 text-sm text-slate-400">
          Overrides the programme defaults for this affiliate only. Changes apply
          to future commission runs; entries already written are not recalculated.
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(terms);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Commission type">
              <Select value={terms.commissionType} onChange={set('commissionType')}>
                <option value="revenue_share">Revenue Share</option>
                <option value="cpa">CPA (Cost Per Action)</option>
                <option value="hybrid">Hybrid</option>
              </Select>
            </Field>

            <Field label="Tier">
              <Select value={terms.tierLabel} onChange={set('tierLabel')}>
                <option>Bronze</option>
                <option>Silver</option>
                <option>Gold</option>
                <option>Platinum</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rev share (%)">
              <Input type="number" min="0" max="100" step="0.5" value={terms.commissionRate} onChange={set('commissionRate')} />
            </Field>
            <Field label="CPA amount (₹)">
              <Input type="number" min="0" value={terms.cpaAmount} onChange={set('cpaAmount')} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Override to parent (%)${data.parent_name ? ` — ${data.parent_name}` : ''}`}>
              <Input type="number" min="0" max="100" step="0.5" value={terms.overrideRate} onChange={set('overrideRate')} />
            </Field>
            <Field label="Payout threshold (₹)">
              <Input type="number" min="0" value={terms.payoutThreshold} onChange={set('payoutThreshold')} />
            </Field>
          </div>

          <Field label="Parent affiliate ID">
            <Input
              type="number"
              placeholder="Blank for a direct partner"
              value={terms.parentAffiliateId}
              onChange={set('parentAffiliateId')}
            />
          </Field>
          <p className="-mt-2 text-xs text-slate-500">
            Reassigning the parent moves this affiliate in the network tree. A change
            that would create a loop is refused.
          </p>

          <Button type="submit" busy={busy}>Save commission terms</Button>
        </form>
      </div>
    </div>
  );
}
