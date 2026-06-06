'use client';

import { useState } from 'react';
import { Gift, Plus, Pencil } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  Button,
  Modal,
  Field,
  Input,
  Select,
  toast,
  useAdminData,
  inr,
} from '@/components/admin/AdminShell';

const emptyBonus = {
  name: '',
  display_title: '',
  bonus_type: 'deposit',
  value_type: 'fixed',
  value_amount: 100,
  min_deposit: 0,
  wagering_multiplier: 35,
  status: 'draft',
};

export default function AdminBonusesPage() {
  const { data: bonuses, loading, reload } = useAdminData('/api/v1/admin/bonuses');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyBonus);
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing === 'new') {
        await adminApi('/api/v1/admin/bonuses/create', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Bonus created');
      } else {
        await adminApi(`/api/v1/admin/bonuses/${editing}`, { method: 'PATCH', body: JSON.stringify(form) });
        toast.success('Bonus updated');
      }
      setEditing(null);
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
      label: 'Bonus',
      render: (r) => (
        <div>
          <p className="font-medium text-white">{r.display_title || r.name}</p>
          <p className="text-xs text-slate-500">{r.name}</p>
        </div>
      ),
    },
    { key: 'bonus_type', label: 'Type', render: (r) => <span className="capitalize text-slate-300">{r.bonus_type.replace(/_/g, ' ')}</span> },
    {
      key: 'value_amount',
      label: 'Value',
      render: (r) => (r.value_type === 'percentage' ? `${r.value_amount}%` : inr(r.value_amount)),
    },
    { key: 'wagering_multiplier', label: 'Wagering', render: (r) => `${r.wagering_multiplier}×` },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            icon={Pencil}
            onClick={() => {
              setForm({
                name: r.name,
                display_title: r.display_title || '',
                bonus_type: r.bonus_type,
                value_type: r.value_type,
                value_amount: r.value_amount,
                min_deposit: r.min_deposit,
                wagering_multiplier: r.wagering_multiplier,
                status: r.status,
              });
              setEditing(r.id);
            }}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell
      title="Bonuses & Promotions"
      subtitle={`${bonuses?.length ?? 0} campaigns`}
      actions={<Button icon={Plus} onClick={() => { setForm(emptyBonus); setEditing('new'); }}>Add bonus</Button>}
    >
      <DataTable
        columns={columns}
        rows={bonuses}
        loading={loading}
        searchable
        searchKeys={['name', 'display_title', 'bonus_type']}
        searchPlaceholder="Search bonuses…"
        emptyIcon={Gift}
        emptyMessage="No bonuses configured"
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add bonus' : 'Edit bonus'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button form="bonus-form" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <form id="bonus-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Internal name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Display title">
            <Input value={form.display_title} onChange={(e) => setForm({ ...form, display_title: e.target.value })} />
          </Field>
          <Field label="Bonus type">
            <Select value={form.bonus_type} onChange={(e) => setForm({ ...form, bonus_type: e.target.value })}>
              <option value="deposit">Deposit</option>
              <option value="no_deposit">No deposit</option>
              <option value="cashback">Cashback</option>
              <option value="free_spin">Free spin</option>
            </Select>
          </Field>
          <Field label="Value type">
            <Select value={form.value_type} onChange={(e) => setForm({ ...form, value_type: e.target.value })}>
              <option value="fixed">Fixed (₹)</option>
              <option value="percentage">Percentage (%)</option>
            </Select>
          </Field>
          <Field label="Value amount">
            <Input type="number" step="0.01" value={form.value_amount} onChange={(e) => setForm({ ...form, value_amount: parseFloat(e.target.value) })} />
          </Field>
          <Field label="Min deposit">
            <Input type="number" value={form.min_deposit} onChange={(e) => setForm({ ...form, min_deposit: parseFloat(e.target.value) })} />
          </Field>
          <Field label="Wagering multiplier">
            <Input type="number" step="0.5" value={form.wagering_multiplier} onChange={(e) => setForm({ ...form, wagering_multiplier: parseFloat(e.target.value) })} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </Select>
          </Field>
        </form>
      </Modal>
    </AdminShell>
  );
}
