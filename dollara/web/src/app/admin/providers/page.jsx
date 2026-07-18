'use client';

import { useState } from 'react';
import { Building2, ChevronDown, Plus, Pencil } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  DataTable,
  StatusBadge,
  Button,
  Modal,
  Field,
  Input,
  Toggle,
  ImageUploadField,
  toast,
  useAdminData,
  fmtDate,
} from '@/components/admin/AdminShell';

const emptyProvider = {
  name: '',
  slug: '',
  logo_url: '',
  is_active: true,
  // Per-provider aggregator credentials. Left blank, the provider rides the
  // platform-wide account from the API's environment config; filled in, it is
  // integrated on its own account (a standalone lottery vendor, a second
  // aggregator) without touching anything else in the catalog.
  agency_uid: '',
  aes_secret_key: '',
  server_url: '',
  launch_path: '',
  player_prefix: '',
  callback_path: '',
  currency_code: '',
  delayed_settlement: false,
};

function providerToForm(r) {
  return {
    name: r.name,
    slug: r.slug,
    logo_url: r.logo_url || '',
    is_active: r.is_active,
    agency_uid: r.agency_uid || '',
    // Never round-tripped from the API — a blank field leaves the stored key
    // untouched, only a typed value replaces it.
    aes_secret_key: '',
    server_url: r.server_url || '',
    launch_path: r.launch_path || '',
    player_prefix: r.player_prefix || '',
    callback_path: r.callback_path || '',
    currency_code: r.currency_code || '',
    delayed_settlement: !!r.delayed_settlement,
  };
}

export default function AdminProvidersPage() {
  const { data: providers, loading, reload } = useAdminData('/api/v1/admin/providers');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProvider);
  const [busy, setBusy] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing === 'new') {
        await adminApi('/api/v1/admin/providers/create', { method: 'POST', body: JSON.stringify(form) });
        toast.success('Provider created');
      } else {
        await adminApi(`/api/v1/admin/providers/${editing}`, { method: 'PATCH', body: JSON.stringify(form) });
        toast.success('Provider updated');
      }
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (p) => {
    try {
      await adminApi(`/api/v1/admin/providers/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      toast.success(p.is_active ? 'Provider disabled — its games are now hidden from players' : 'Provider enabled');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Provider',
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500/10 text-xs font-bold text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
            {r.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="font-medium text-white">{r.name}</span>
        </div>
      ),
    },
    { key: 'slug', label: 'Slug', render: (r) => <span className="text-slate-400">{r.slug}</span> },
    { key: 'games', label: 'Games', render: (r) => r.game_count ?? '—' },
    {
      key: 'integration',
      label: 'Integration',
      render: (r) => (
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
              r.uses_own_account
                ? 'bg-sky-500/15 text-sky-400 ring-sky-500/30'
                : 'bg-slate-500/15 text-slate-400 ring-slate-500/30'
            }`}
          >
            {r.uses_own_account ? 'Own account' : 'Platform account'}
          </span>
          {r.delayed_settlement && (
            <span className="whitespace-nowrap rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/30">
              Settles later
            </span>
          )}
        </div>
      ),
    },
    { key: 'is_active', label: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'active' : 'inactive'} /> },
    { key: 'created_at', label: 'Added', render: (r) => fmtDate(r.created_at) },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            icon={Pencil}
            onClick={() => {
              setForm(providerToForm(r));
              setShowCredentials(r.uses_own_account);
              setEditing(r.id);
            }}
          >
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toggleActive(r)}>
            {r.is_active ? 'Disable' : 'Enable'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell
      title="Game Providers"
      subtitle={`${providers?.length ?? 0} providers`}
      actions={
        <Button
          icon={Plus}
          onClick={() => {
            setForm(emptyProvider);
            setShowCredentials(false);
            setEditing('new');
          }}
        >
          Add provider
        </Button>
      }
    >
      <DataTable
        columns={columns}
        rows={providers}
        loading={loading}
        searchable
        searchKeys={['name', 'slug']}
        searchPlaceholder="Search providers…"
        emptyIcon={Building2}
        emptyMessage="No providers yet"
      />

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add provider' : 'Edit provider'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button form="provider-form" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <form id="provider-form" onSubmit={save} className="space-y-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Slug">
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          </Field>
          <ImageUploadField
            label="Logo"
            value={form.logo_url}
            onChange={(url) => setForm({ ...form, logo_url: url })}
            placeholder="https://…"
          />
          <div>
            <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Enabled" />
            <p className="mt-1.5 text-xs text-slate-500">When disabled, all of this provider&apos;s games are hidden from players on the site.</p>
          </div>

          <div>
            <Toggle
              checked={form.delayed_settlement}
              onChange={(v) => setForm({ ...form, delayed_settlement: v })}
              label="Settles after the event (sportsbook / lottery)"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Stakes on this provider stay <strong>Pending</strong> in bet history until
              the official result arrives, instead of showing as an immediate loss.
            </p>
          </div>

          {/* --- Own aggregator account (optional) --- */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/50">
            <button
              type="button"
              onClick={() => setShowCredentials((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span>
                <span className="block text-sm font-semibold text-white">
                  Own aggregator account
                </span>
                <span className="text-xs text-slate-500">
                  Only for vendors integrated separately — leave blank to use the
                  platform account
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                  showCredentials ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showCredentials && (
              <div className="space-y-4 border-t border-slate-800 px-4 py-4">
                <Field label="Agency UID">
                  <Input
                    value={form.agency_uid}
                    onChange={(e) => setForm({ ...form, agency_uid: e.target.value })}
                    placeholder="Provided by the vendor"
                  />
                </Field>
                <Field
                  label={
                    editing !== 'new' && providers?.find((p) => p.id === editing)?.has_aes_secret_key
                      ? 'AES secret key (set — type to replace)'
                      : 'AES secret key'
                  }
                >
                  <Input
                    type="password"
                    autoComplete="off"
                    value={form.aes_secret_key}
                    onChange={(e) => setForm({ ...form, aes_secret_key: e.target.value })}
                    placeholder="Leave blank to keep the current key"
                  />
                </Field>
                <Field label="Server URL">
                  <Input
                    value={form.server_url}
                    onChange={(e) => setForm({ ...form, server_url: e.target.value })}
                    placeholder="https://api.vendor.com"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Launch path">
                    <Input
                      value={form.launch_path}
                      onChange={(e) => setForm({ ...form, launch_path: e.target.value })}
                      placeholder="/game/v1"
                    />
                  </Field>
                  <Field label="Player prefix">
                    <Input
                      value={form.player_prefix}
                      onChange={(e) => setForm({ ...form, player_prefix: e.target.value })}
                      placeholder="LOTTO_"
                    />
                  </Field>
                  <Field label="Callback path">
                    <Input
                      value={form.callback_path}
                      onChange={(e) => setForm({ ...form, callback_path: e.target.value })}
                      placeholder="/api/v1/games/callback"
                    />
                  </Field>
                  <Field label="Currency">
                    <Input
                      value={form.currency_code}
                      onChange={(e) => setForm({ ...form, currency_code: e.target.value })}
                      placeholder="INR"
                    />
                  </Field>
                </div>
                <p className="text-xs text-slate-500">
                  Any field left blank falls back to the platform-wide configuration.
                </p>
              </div>
            )}
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}
