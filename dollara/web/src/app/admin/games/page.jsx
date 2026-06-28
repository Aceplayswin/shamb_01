'use client';

import { useState } from 'react';
import { Gamepad2, Plus, Pencil, Star } from 'lucide-react';
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
  Toggle,
  toast,
  useAdminData,
} from '@/components/admin/AdminShell';

const CATEGORIES = ['slots', 'live_casino', 'sports', 'lottery', 'ai_games', 'fantasy', 'virtual_sports'];

const emptyGame = {
  name: '',
  slug: '',
  category: 'slots',
  provider_id: '',
  rtp: 96.5,
  min_bet: 10,
  max_bet: 100000,
  is_featured: false,
  is_active_web: true,
  is_provably_fair: false,
};

export default function AdminGamesPage() {
  const { data: games, loading, reload } = useAdminData('/api/v1/admin/games');
  const { data: providers } = useAdminData('/api/v1/admin/providers');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyGame);
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setForm(emptyGame);
    setEditing('new');
  };
  const openEdit = (g) => {
    setForm({
      name: g.name,
      slug: g.slug,
      category: g.category,
      provider_id: g.provider_id || '',
      rtp: g.rtp ?? '',
      min_bet: g.min_bet,
      max_bet: g.max_bet,
      is_featured: g.is_featured,
      is_active_web: g.is_active_web,
      is_provably_fair: g.is_provably_fair,
    });
    setEditing(g.id);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = { ...form, provider_id: form.provider_id || null };
    try {
      if (editing === 'new') {
        await adminApi('/api/v1/admin/games/create', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Game created');
      } else {
        await adminApi(`/api/v1/admin/games/${editing}`, { method: 'PATCH', body: JSON.stringify(payload) });
        toast.success('Game updated');
      }
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (g) => {
    try {
      await adminApi(`/api/v1/admin/games/${g.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active_web: !g.is_active_web }),
      });
      toast.success(g.is_active_web ? 'Game disabled' : 'Game enabled');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Game',
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.is_featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          <div>
            <p className="font-medium text-white">{r.name}</p>
            <p className="text-xs text-slate-500">{r.slug}</p>
          </div>
        </div>
      ),
    },
    { key: 'category', label: 'Category', render: (r) => <span className="capitalize text-slate-300">{r.category.replace(/_/g, ' ')}</span> },
    { key: 'provider_name', label: 'Provider', render: (r) => r.provider_name || '—' },
    { key: 'rtp', label: 'RTP', render: (r) => (r.rtp ? `${r.rtp}%` : '—') },
    { key: 'play_count', label: 'Plays', render: (r) => r.play_count?.toLocaleString('en-IN') },
    { key: 'is_active_web', label: 'Web', render: (r) => <StatusBadge status={r.is_active_web ? 'active' : 'inactive'} /> },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="secondary" size="sm" icon={Pencil} onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toggleActive(r)}>
            {r.is_active_web ? 'Disable' : 'Enable'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell
      title="Games"
      subtitle={`${games?.length ?? 0} games in catalog`}
      actions={<Button icon={Plus} onClick={openCreate}>Add game</Button>}
    >
      <DataTable
        columns={columns}
        rows={games}
        loading={loading}
        searchable
        searchKeys={['name', 'slug', 'provider_name', 'category']}
        searchPlaceholder="Search games…"
        pageSize={15}
        emptyIcon={Gamepad2}
        emptyMessage="No games yet"
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add game' : 'Edit game'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button form="game-form" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save game'}</Button>
          </>
        }
      >
        <form id="game-form" onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Slug">
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </Select>
            </Field>
            <Field label="Provider">
              <Select value={form.provider_id} onChange={(e) => setForm({ ...form, provider_id: e.target.value })}>
                <option value="">No provider</option>
                {providers?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="RTP %">
              <Input type="number" step="0.01" value={form.rtp} onChange={(e) => setForm({ ...form, rtp: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min bet">
                <Input type="number" value={form.min_bet} onChange={(e) => setForm({ ...form, min_bet: e.target.value })} />
              </Field>
              <Field label="Max bet">
                <Input type="number" value={form.max_bet} onChange={(e) => setForm({ ...form, max_bet: e.target.value })} />
              </Field>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 pt-2">
            <Toggle checked={form.is_featured} onChange={(v) => setForm({ ...form, is_featured: v })} label="Featured" />
            <Toggle checked={form.is_active_web} onChange={(v) => setForm({ ...form, is_active_web: v })} label="Active on web" />
            <Toggle checked={form.is_provably_fair} onChange={(v) => setForm({ ...form, is_provably_fair: v })} label="Provably fair" />
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}
