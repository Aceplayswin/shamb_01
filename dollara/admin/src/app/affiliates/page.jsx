'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Eye, Trash2 } from 'lucide-react';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  Button,
  confirmDialog,
  toast,
  fmtDate,
} from '@/components/admin/AdminShell';
import { mockAffiliates } from '@/lib/affiliateMockData';

const TIER_COLORS = {
  Bronze:   'border-orange-500/30 bg-orange-500/15 text-orange-400',
  Silver:   'border-slate-400/30 bg-slate-400/15 text-slate-300',
  Gold:     'border-amber-500/30 bg-amber-500/15 text-amber-400',
  Platinum: 'border-violet-500/30 bg-violet-500/15 text-violet-400',
};

export default function AffiliateListPage() {
  const router = useRouter();
  const [items, setItems] = useState(mockAffiliates);
  const [loading, setLoading] = useState(false);

  const toggleStatus = async (row) => {
    const isSuspending = row.status === 'active';
    const actionText = isSuspending ? 'suspend' : 'reactivate';
    
    const ok = await confirmDialog({
      title: `${isSuspending ? 'Suspend' : 'Reactivate'} affiliate?`,
      text: `Are you sure you want to ${actionText} ${row.name}?`,
      confirmText: isSuspending ? 'Suspend' : 'Reactivate',
      icon: 'question',
    });
    
    if (!ok) return;

    // Mock toggle action
    setItems((prev) => prev.map((app) => app.id === row.id ? { ...app, status: isSuspending ? 'suspended' : 'active' } : app));
    toast.success(`Affiliate ${isSuspending ? 'suspended' : 'reactivated'}`);
  };

  const deleteAffiliate = async (row) => {
    const ok = await confirmDialog({
      title: 'Delete affiliate?',
      text: `Are you sure you want to completely remove ${row.name}? This action cannot be undone.`,
      confirmText: 'Delete permanently',
      icon: 'warning',
    });
    
    if (!ok) return;

    // Mock delete action
    setItems((prev) => prev.filter((app) => app.id !== row.id));
    toast.success('Affiliate deleted');
  };

  const formatCommission = (r) => {
    if (r.commission_type === 'revenue_share') return `${r.commission_rate}% Rev Share`;
    if (r.commission_type === 'cpa') return `$${r.cpa_amount} CPA`;
    return `${r.commission_rate}% + $${r.cpa_amount} Hybrid`;
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
        { value: 'active', label: 'Active' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'blocked', label: 'Blocked' },
      ],
    },
    {
      key: 'tier',
      label: 'Tier',
      render: (r) => (
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${TIER_COLORS[r.tier] || TIER_COLORS.Bronze}`}>
          {r.tier}
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
      render: (r) => <span className="font-semibold text-emerald-400">${r.total_earnings.toLocaleString()}</span>,
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
            {r.status === 'active' ? 'Suspend' : 'Reactivate'}
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => deleteAffiliate(r)} className="text-slate-400 hover:text-rose-400" />
        </div>
      ),
    },
  ];

  return (
    <AdminShell 
      title="Affiliates" 
      subtitle={`${items.length} partners`}
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
