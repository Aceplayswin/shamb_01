'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, User, FileText, DollarSign, Users, 
  List, CreditCard, Key, Activity, Check, X 
} from 'lucide-react';
import {
  StatusBadge,
  Button,
  DataTable,
  confirmDialog,
  toast,
  fmtDate,
  Modal,
  Field,
  Input,
  Select,
} from '@/components/admin/AdminShell';
import { mockAffiliateDetail } from '@/lib/affiliateMockData';

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
  const [data, setData] = useState(mockAffiliateDetail);
  const [activeTab, setActiveTab] = useState('profile');

  // Actions
  const handleSuspend = async () => {
    const isSuspending = data.status === 'active';
    const ok = await confirmDialog({
      title: `${isSuspending ? 'Suspend' : 'Reactivate'} affiliate?`,
      text: `Are you sure you want to ${isSuspending ? 'suspend' : 'reactivate'} ${data.name}?`,
      confirmText: isSuspending ? 'Suspend' : 'Reactivate',
    });
    if (ok) {
      setData({ ...data, status: isSuspending ? 'suspended' : 'active' });
      toast.success(`Affiliate ${isSuspending ? 'suspended' : 'reactivated'}`);
    }
  };

  const handleApproveDoc = (id) => {
    setData({
      ...data,
      kyc_documents: data.kyc_documents.map(d => d.id === id ? { ...d, status: 'approved' } : d)
    });
    toast.success('Document approved');
  };

  const handleRejectDoc = async (id) => {
    const ok = await confirmDialog({
      title: 'Reject document?',
      text: 'Are you sure you want to reject this KYC document?',
      confirmText: 'Reject',
      icon: 'warning'
    });
    if (ok) {
      setData({
        ...data,
        kyc_documents: data.kyc_documents.map(d => d.id === id ? { ...d, status: 'rejected' } : d)
      });
      toast.success('Document rejected');
    }
  };

  const handleRevokeKey = async (id) => {
    const ok = await confirmDialog({
      title: 'Revoke API Key?',
      text: 'This will instantly break any integrations using this key.',
      confirmText: 'Revoke Key',
      icon: 'warning'
    });
    if (ok) {
      setData({
        ...data,
        api_keys: data.api_keys.map(k => k.id === id ? { ...k, status: 'revoked' } : k)
      });
      toast.success('Key revoked');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
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
          <p className="text-slate-400">{data.company} • ID: {data.id}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={handleSuspend}>
            {data.status === 'active' ? 'Suspend' : 'Reactivate'}
          </Button>
          <Button variant="danger">Delete</Button>
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
                <p className="text-sm"><span className="text-slate-500">Tier:</span> <span className="text-amber-400 font-medium">{data.tier}</span></p>
                <p className="text-sm"><span className="text-slate-500">Joined:</span> <span className="text-slate-200">{fmtDate(data.joined_at)}</span></p>
              </div>
              <h3 className="font-semibold text-white mt-6">Payout Method</h3>
              <div className="bg-slate-950 p-4 rounded-lg space-y-2">
                <p className="text-sm"><span className="text-slate-500">Type:</span> <span className="text-slate-200">{data.payment_method.type}</span></p>
                <p className="text-sm"><span className="text-slate-500">Details:</span> <span className="text-slate-200">{data.payment_method.details}</span></p>
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
                  <p className="text-xl font-bold text-white">${data.stats.total_deposits.toLocaleString()}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-emerald-500/20">
                  <p className="text-xs text-emerald-500">Total Earnings</p>
                  <p className="text-xl font-bold text-emerald-400">${data.stats.total_earnings.toLocaleString()}</p>
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
                      <Button variant="success" size="sm" className="flex-1" onClick={() => handleApproveDoc(doc.id)}>Approve</Button>
                      <Button variant="danger" size="sm" className="flex-1" onClick={() => handleRejectDoc(doc.id)}>Reject</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'commission' && (
          <div className="max-w-md space-y-6">
            <div>
              <h3 className="font-semibold text-white">Commission Override</h3>
              <p className="text-sm text-slate-400 mb-4">Set a custom commission rate for this specific affiliate.</p>
              
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); toast.success('Commission updated'); }}>
                <Field label="Commission Type">
                  <Select defaultValue={data.commission.type}>
                    <option value="revenue_share">Revenue Share</option>
                    <option value="cpa">CPA (Cost Per Action)</option>
                    <option value="hybrid">Hybrid</option>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Rev Share (%)">
                    <Input type="number" defaultValue={data.commission.rate} />
                  </Field>
                  <Field label="CPA Amount ($)">
                    <Input type="number" defaultValue={data.commission.cpa} />
                  </Field>
                </div>
                <Button type="submit">Save Commission Settings</Button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <DataTable
            columns={[
              { key: 'id', label: 'User ID', render: (r) => <span className="text-slate-400">{r.id}</span> },
              { key: 'username', label: 'Username', render: (r) => <span className="text-white font-medium">{r.username}</span> },
              { key: 'signed_up', label: 'Signed Up', render: (r) => fmtDate(r.signed_up) },
              { key: 'total_deposits', label: 'Deposits', render: (r) => <span className="text-emerald-400">${r.total_deposits}</span> },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={data.referred_users}
          />
        )}

        {activeTab === 'ledger' && (
          <DataTable
            columns={[
              { key: 'period', label: 'Period', render: (r) => <span className="text-white font-medium">{r.period}</span> },
              { key: 'type', label: 'Type', render: (r) => <span className="text-slate-300">{r.type}</span> },
              { key: 'base_amount', label: 'Base Amount', render: (r) => <span className="text-slate-400">${r.base_amount}</span> },
              { key: 'rate', label: 'Rate/Deal', render: (r) => <span className="text-amber-400">{r.rate}</span> },
              { key: 'earned', label: 'Earned', render: (r) => <span className="text-emerald-400 font-bold">${r.earned}</span> },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={data.commission_ledger}
          />
        )}

        {activeTab === 'payouts' && (
          <DataTable
            columns={[
              { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) },
              { key: 'amount', label: 'Amount', render: (r) => <span className="text-emerald-400 font-bold">${r.amount}</span> },
              { key: 'method', label: 'Method', render: (r) => <span className="text-slate-300">{r.method}</span> },
              { key: 'reference', label: 'Reference', render: (r) => <span className="text-slate-500 font-mono text-xs">{r.reference}</span> },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
            rows={data.payout_history}
          />
        )}

        {activeTab === 'api' && (
          <DataTable
            columns={[
              { key: 'prefix', label: 'Key Prefix', render: (r) => <span className="text-slate-300 font-mono bg-slate-950 px-2 py-1 rounded">{r.prefix}</span> },
              { key: 'created_at', label: 'Created', render: (r) => fmtDate(r.created_at) },
              { key: 'last_used', label: 'Last Used', render: (r) => fmtDate(r.last_used) },
              { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { key: 'actions', label: '', render: (r) => (
                <div className="flex justify-end">
                  {r.status === 'active' && (
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
              { key: 'timestamp', label: 'Time', render: (r) => fmtDate(r.timestamp) },
              { key: 'action', label: 'Action', render: (r) => <span className="text-white">{r.action}</span> },
              { key: 'ip', label: 'IP Address', render: (r) => <span className="text-slate-400 font-mono text-xs">{r.ip}</span> },
            ]}
            rows={data.activity_log}
          />
        )}
      </div>
    </div>
  );
}
