'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import {
  ShieldCheck, LogOut, Plus, Loader2, Database, Globe, Power, Trash2,
  RefreshCw, Palette, Users,
} from 'lucide-react';
import {
  getSuperAdminToken, clearSuperAdminToken, listProducts, createProduct,
  disableProduct, updateProduct, deleteProduct, provisionProduct, updateBranding,
  getAnalytics,
} from '@/services/superAdminApi';

const EMPTY_FORM = {
  slug: '', name: '', theme_color: '#ff9800', secondary_color: '#a78bfa', domains: '',
};

function swalDark(opts) {
  return Swal.fire({ background: '#15131f', color: '#fff', confirmButtonColor: '#6366f1', ...opts });
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(null);
  const [editBrand, setEditBrand] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, stats] = await Promise.all([listProducts(), getAnalytics().catch(() => [])]);
      setProducts(prods);
      setAnalytics(stats);
    } catch (err) {
      swalDark({ icon: 'error', title: 'Failed to load', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getSuperAdminToken()) {
      router.replace('/super-admin/login');
      return;
    }
    load();
  }, [router, load]);

  const statFor = (slug) => analytics.find((a) => a.slug === slug);

  const logout = () => {
    clearSuperAdminToken();
    router.replace('/super-admin/login');
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createProduct({
        slug: form.slug.trim().toLowerCase(),
        name: form.name.trim(),
        branding: {
          product_name: form.name.trim(),
          theme_color: form.theme_color,
          secondary_color: form.secondary_color,
        },
        domains: form.domains.split(',').map((d) => d.trim()).filter(Boolean),
      });
      setForm(EMPTY_FORM);
      await swalDark({ icon: 'success', title: 'Product created', timer: 1400, showConfirmButton: false });
      load();
    } catch (err) {
      swalDark({ icon: 'error', title: 'Create failed', text: err.message });
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (slug, label, fn) => {
    setBusy(`${slug}:${label}`);
    try {
      await fn();
      await load();
    } catch (err) {
      swalDark({ icon: 'error', title: `${label} failed`, text: err.message });
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = (p) =>
    runAction(p.slug, 'status', () =>
      p.status === 'active'
        ? disableProduct(p.slug)
        : updateProduct(p.slug, { status: 'active' })
    );

  const confirmDelete = async (p) => {
    const res = await swalDark({
      icon: 'warning',
      title: `Delete ${p.name}?`,
      text: 'Removes control-plane records. The tenant database is not dropped.',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444',
    });
    if (res.isConfirmed) runAction(p.slug, 'delete', () => deleteProduct(p.slug));
  };

  const saveBranding = async (slug) => {
    await runAction(slug, 'branding', () => updateBranding(slug, editBrand));
    setEditBrand(null);
  };

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-surface-950/80 px-6 py-4 backdrop-blur-xl">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-400 to-emerald-500">
          <ShieldCheck className="h-5 w-5 text-surface-950" strokeWidth={2.5} />
        </span>
        <div>
          <h1 className="font-display text-lg font-extrabold leading-none">Platform Console</h1>
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">Super Admin</p>
        </div>
        <button
          onClick={load}
          className="ml-auto flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 p-6">
        {/* Create product */}
        <section className="rounded-2xl border border-white/10 bg-surface-800/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
            <Plus className="h-5 w-5 text-emerald-400" /> Onboard a new product
          </h2>
          <form onSubmit={submitCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Slug</span>
              <input
                required value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="productd"
                className="w-full rounded-lg border border-white/10 bg-surface-950/60 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Name</span>
              <input
                required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Product D"
                className="w-full rounded-lg border border-white/10 bg-surface-950/60 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Domains (comma-separated)</span>
              <input
                value={form.domains}
                onChange={(e) => setForm({ ...form, domains: e.target.value })}
                placeholder="productd.com, productd.localhost"
                className="w-full rounded-lg border border-white/10 bg-surface-950/60 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Theme color</span>
              <input
                type="color" value={form.theme_color}
                onChange={(e) => setForm({ ...form, theme_color: e.target.value })}
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-950/60"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-slate-400">Secondary color</span>
              <input
                type="color" value={form.secondary_color}
                onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-950/60"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit" disabled={creating}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-400 to-emerald-500 py-2.5 text-sm font-bold text-surface-950 transition hover:opacity-90 disabled:opacity-60"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create & provision
              </button>
            </div>
          </form>
          <p className="mt-3 text-xs text-slate-500">
            Creating a product provisions a brand-new isolated MySQL database, applies the tenant schema, and seeds it.
          </p>
        </section>

        {/* Products */}
        <section>
          <h2 className="mb-4 font-display text-lg font-bold">Products ({products.length})</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
          ) : (
            <div className="space-y-4">
              {products.map((p) => {
                const stat = statFor(p.slug);
                return (
                  <div key={p.slug} className="rounded-2xl border border-white/10 bg-surface-800/50 p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className="grid h-10 w-10 place-items-center rounded-xl font-display font-black text-surface-950"
                        style={{ background: `linear-gradient(135deg, ${p.branding.theme_color}, ${p.branding.secondary_color})` }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-slate-500">/{p.slug}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase ${p.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
                        {p.status}
                      </span>
                      <div className="ml-auto flex flex-wrap gap-2">
                        <button onClick={() => setEditBrand(editBrand?.slug === p.slug ? null : { slug: p.slug, ...p.branding })} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/5">
                          <Palette className="h-3.5 w-3.5" /> Branding
                        </button>
                        <button onClick={() => runAction(p.slug, 'provision', () => provisionProduct(p.slug))} disabled={busy === `${p.slug}:provision`} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/5 disabled:opacity-50">
                          {busy === `${p.slug}:provision` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />} Provision
                        </button>
                        <button onClick={() => toggleStatus(p)} disabled={busy === `${p.slug}:status`} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/5 disabled:opacity-50">
                          <Power className="h-3.5 w-3.5" /> {p.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => confirmDelete(p)} className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg bg-surface-950/50 px-3 py-2">
                        <p className="flex items-center gap-1.5 text-slate-500"><Database className="h-3.5 w-3.5" /> Database</p>
                        <p className="mt-1 font-semibold">{p.database.db_name ?? '—'}</p>
                        <p className={p.database.is_provisioned ? 'text-emerald-400' : 'text-amber-400'}>
                          {p.database.is_provisioned ? 'provisioned' : 'not provisioned'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-surface-950/50 px-3 py-2">
                        <p className="flex items-center gap-1.5 text-slate-500"><Globe className="h-3.5 w-3.5" /> Domains</p>
                        <p className="mt-1 font-semibold">{p.domains.map((d) => d.host).join(', ') || '—'}</p>
                      </div>
                      <div className="rounded-lg bg-surface-950/50 px-3 py-2">
                        <p className="flex items-center gap-1.5 text-slate-500"><Users className="h-3.5 w-3.5" /> Users</p>
                        <p className="mt-1 font-semibold">{stat?.users ?? (stat?.error ? 'n/a' : '—')}</p>
                      </div>
                      <div className="rounded-lg bg-surface-950/50 px-3 py-2">
                        <p className="text-slate-500">Transactions</p>
                        <p className="mt-1 font-semibold">{stat?.transactions ?? (stat?.error ? 'n/a' : '—')}</p>
                      </div>
                    </div>

                    {editBrand?.slug === p.slug && (
                      <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-surface-950/40 p-4 sm:grid-cols-2">
                        <label className="text-xs">
                          <span className="mb-1 block font-semibold text-slate-400">Product name</span>
                          <input value={editBrand.product_name} onChange={(e) => setEditBrand({ ...editBrand, product_name: e.target.value })} className="w-full rounded-lg border border-white/10 bg-surface-950/60 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                        </label>
                        <label className="text-xs">
                          <span className="mb-1 block font-semibold text-slate-400">Logo URL</span>
                          <input value={editBrand.logo_url || ''} onChange={(e) => setEditBrand({ ...editBrand, logo_url: e.target.value })} className="w-full rounded-lg border border-white/10 bg-surface-950/60 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                        </label>
                        <label className="text-xs">
                          <span className="mb-1 block font-semibold text-slate-400">Theme color</span>
                          <input type="color" value={editBrand.theme_color} onChange={(e) => setEditBrand({ ...editBrand, theme_color: e.target.value })} className="h-10 w-full rounded-lg border border-white/10 bg-surface-950/60" />
                        </label>
                        <label className="text-xs">
                          <span className="mb-1 block font-semibold text-slate-400">Secondary color</span>
                          <input type="color" value={editBrand.secondary_color} onChange={(e) => setEditBrand({ ...editBrand, secondary_color: e.target.value })} className="h-10 w-full rounded-lg border border-white/10 bg-surface-950/60" />
                        </label>
                        <label className="text-xs">
                          <span className="mb-1 block font-semibold text-slate-400">Support email</span>
                          <input value={editBrand.support_email || ''} onChange={(e) => setEditBrand({ ...editBrand, support_email: e.target.value })} className="w-full rounded-lg border border-white/10 bg-surface-950/60 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                        </label>
                        <label className="text-xs">
                          <span className="mb-1 block font-semibold text-slate-400">Support phone</span>
                          <input value={editBrand.support_phone || ''} onChange={(e) => setEditBrand({ ...editBrand, support_phone: e.target.value })} className="w-full rounded-lg border border-white/10 bg-surface-950/60 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                        </label>
                        <div className="sm:col-span-2 flex justify-end gap-2">
                          <button onClick={() => setEditBrand(null)} className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/5">Cancel</button>
                          <button onClick={() => saveBranding(p.slug)} disabled={busy === `${p.slug}:branding`} className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-400 disabled:opacity-60">
                            Save branding
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {products.length === 0 && (
                <p className="rounded-xl border border-white/10 bg-surface-800/40 p-6 text-center text-sm text-slate-400">
                  No products yet. Create your first one above.
                </p>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
