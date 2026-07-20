'use client';

import { useMemo, useState } from 'react';
import { Gamepad2, Plus, Pencil, Star, Image as ImageIcon } from 'lucide-react';
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
  ImageUploadField,
  toast,
  useAdminData,
} from '@/components/admin/AdminShell';

const CATEGORIES = ['slots', 'live_casino', 'sports', 'lottery', 'ai_games', 'fantasy', 'virtual_sports'];

const catLabel = (c) => c.replace(/_/g, ' ');

const emptyGame = {
  name: '',
  slug: '',
  category: 'slots',
  provider_id: '',
  game_uid: '',
  game_type: '',
  thumbnail_url: '',
  rtp: 96.5,
  min_bet: 10,
  max_bet: 100000,
  sort_order: 0,
  is_featured: false,
  is_active: true,
  is_provably_fair: false,
};

export default function AdminGamesPage() {
  const { data: games, loading, reload } = useAdminData('/api/v1/admin/games');
  const { data: providers } = useAdminData('/api/v1/admin/providers');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyGame);
  const [busy, setBusy] = useState(false);
  // Category tab currently in view — 'all' shows the whole catalog.
  const [activeCategory, setActiveCategory] = useState('all');

  // Per-category counts drive the badge on each tab. Only categories that
  // actually have games get a tab, so the bar stays relevant to the catalog.
  const countByCategory = useMemo(() => {
    const counts = {};
    for (const g of games ?? []) {
      counts[g.category] = (counts[g.category] ?? 0) + 1;
    }
    return counts;
  }, [games]);

  const tabs = useMemo(
    () => [
      { key: 'all', label: 'All', count: games?.length ?? 0 },
      ...CATEGORIES.filter((c) => countByCategory[c]).map((c) => ({
        key: c,
        label: catLabel(c),
        count: countByCategory[c],
      })),
    ],
    [games, countByCategory],
  );

  const visibleGames = useMemo(
    () => (activeCategory === 'all' ? games : (games ?? []).filter((g) => g.category === activeCategory)),
    [games, activeCategory],
  );

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
      game_uid: g.game_uid || '',
      game_type: g.game_type || '',
      thumbnail_url: g.thumbnail_url || '',
      rtp: g.rtp ?? '',
      min_bet: g.min_bet,
      max_bet: g.max_bet,
      sort_order: g.sort_order ?? 0,
      is_featured: g.is_featured,
      is_active: g.is_active,
      is_provably_fair: g.is_provably_fair,
    });
    setEditing(g.id);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      ...form,
      provider_id: form.provider_id || null,
      game_uid: form.game_uid?.trim() || null,
      game_type: form.game_type?.trim() || null,
      thumbnail_url: form.thumbnail_url?.trim() || null,
      rtp: form.rtp === '' ? null : form.rtp,
      sort_order: Number(form.sort_order) || 0,
    };
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

  const columns = [
    {
      key: 'name',
      label: 'Game',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
            {r.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.thumbnail_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-4 w-4 text-slate-600" />
            )}
          </span>
          <div className="flex items-center gap-2">
            {r.is_featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
            <div>
              <p className="font-medium text-white">{r.name}</p>
              <p className="text-xs text-slate-500">{r.slug}</p>
            </div>
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
      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
        {tabs.map((t) => {
          const active = activeCategory === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveCategory(t.key)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                active
                  ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  active ? 'bg-indigo-500/20 text-indigo-200' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <DataTable
        columns={columns}
        rows={visibleGames}
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
            <Field label="Game key (UID)">
              <Input
                value={form.game_uid}
                onChange={(e) => setForm({ ...form, game_uid: e.target.value })}
                placeholder="Aggregator game UID"
              />
            </Field>
            <Field label="Game type">
              <Input
                value={form.game_type}
                onChange={(e) => setForm({ ...form, game_type: e.target.value })}
                placeholder="e.g. Slot Game, CasinoTable"
              />
            </Field>
            <Field label="RTP %">
              <Input type="number" step="0.01" value={form.rtp} onChange={(e) => setForm({ ...form, rtp: e.target.value })} />
            </Field>
            <Field label="Sort order">
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
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
          <ImageUploadField
            label="Image"
            value={form.thumbnail_url}
            onChange={(url) => setForm({ ...form, thumbnail_url: url })}
            placeholder="https://…/game.png"
          />
          <div className="flex flex-wrap gap-6 pt-2">
            <Toggle checked={form.is_featured} onChange={(v) => setForm({ ...form, is_featured: v })} label="Featured" />
            <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Launch enabled" />
            <Toggle checked={form.is_provably_fair} onChange={(v) => setForm({ ...form, is_provably_fair: v })} label="Provably fair" />
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}
