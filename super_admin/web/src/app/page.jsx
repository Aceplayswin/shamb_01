'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import {
  ShieldCheck, LogOut, Plus, Loader2, Database, Globe, Power, Trash2,
  RefreshCw, Palette, Users, Sun, Moon, LayoutDashboard, Box, BarChart2,
  ChevronRight, Activity, Menu, X, Server, KeyRound, User2,
} from 'lucide-react';
import {
  getSuperAdminToken, clearSuperAdminToken, listProducts, createProduct,
  disableProduct, updateProduct, deleteProduct, provisionProduct, updateBranding,
  getAnalytics,
} from '@/services/api';
import { useTheme } from './providers';

/* ── Empty form state for Add Product modal ── */
const EMPTY_FORM = {
  name: '',
  slug: '',
  domain: '',
  host: '',
  db_user: '',
  db_password: '',
  db_name: '',
};

function swalThemed(opts, theme) {
  const isDark = theme === 'dark';
  return Swal.fire({
    background: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#f1f5f9' : '#111827',
    confirmButtonColor: '#4f46e5',
    ...opts,
  });
}

const NAV_ITEMS = [
  { id: 'overview',  label: 'Overview',  icon: LayoutDashboard },
  { id: 'products',  label: 'Products',  icon: Box },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
];

/* ── Stat card ── */
function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

/* ── Add Product Modal ── */
function AddProductModal({ open, onClose, onSubmit, loading }) {
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  if (!open) return null;

  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none ' +
    'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ' +
    'dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-400';

  const labelCls = 'mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400';

  const fields = [
    { key: 'name',        label: 'Product Name',  placeholder: 'My Platform',       icon: Box,      type: 'text'     },
    { key: 'slug',        label: 'Slug',           placeholder: 'my-platform',       icon: Globe,    type: 'text'     },
    { key: 'domain',      label: 'Domain',         placeholder: 'myplatform.com',    icon: Globe,    type: 'text'     },
    { key: 'host',        label: 'DB Host',        placeholder: 'db.example.com',    icon: Server,   type: 'text'     },
    { key: 'db_user',     label: 'DB User',        placeholder: 'db_username',       icon: User2,    type: 'text'     },
    { key: 'db_password', label: 'DB Password',    placeholder: '••••••••',          icon: KeyRound, type: 'password' },
    { key: 'db_name',     label: 'Database Name',  placeholder: 'myplatform_db',     icon: Database, type: 'text'     },
  ];

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Plus className="h-4 w-4 text-white" />
            </span>
            <div>
              <h2 className="font-display text-sm font-bold text-gray-900 dark:text-white">
                Add New Product
              </h2>
              <p className="text-xs text-gray-400">Fill in the details to onboard a product</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(({ key, label, placeholder, type }) => (
              <label key={key} className={key === 'domain' || key === 'db_name' ? 'sm:col-span-2 text-sm' : 'text-sm'}>
                <span className={labelCls}>{label}</span>
                <input
                  type={type}
                  required={['name', 'slug', 'host', 'db_user', 'db_password', 'db_name'].includes(key)}
                  value={form[key]}
                  onChange={set(key)}
                  placeholder={placeholder}
                  autoComplete={type === 'password' ? 'new-password' : 'off'}
                  className={inputCls}
                />
              </label>
            ))}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-gray-100 dark:border-gray-700" />

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Main Dashboard Page
══════════════════════════════════════════ */
export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();

  const [activeNav, setActiveNav]     = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen]     = useState(false);
  const [products, setProducts]       = useState([]);
  const [analytics, setAnalytics]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [busy, setBusy]               = useState(null);
  const [editBrand, setEditBrand]     = useState(null);

  const swal = (opts) => swalThemed(opts, theme);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, stats] = await Promise.all([listProducts(), getAnalytics().catch(() => [])]);
      setProducts(prods);
      setAnalytics(stats);
    } catch (err) {
      swalThemed({ icon: 'error', title: 'Failed to load', text: err.message }, theme);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getSuperAdminToken()) { router.replace('/login'); return; }
    load();
  }, [router, load]);

  const statFor     = (slug) => analytics.find((a) => a.slug === slug);
  const activeCount = products.filter((p) => p.status === 'active').length;
  const totalUsers  = analytics.reduce((s, a) => s + (a.users || 0), 0);
  const totalTx     = analytics.reduce((s, a) => s + (a.transactions || 0), 0);

  const logout = () => { clearSuperAdminToken(); router.replace('/login'); };

  /* ── Create product from modal form ── */
  const handleCreateProduct = async (form) => {
    setCreating(true);
    try {
      await createProduct({
        slug: form.slug.trim().toLowerCase(),
        name: form.name.trim(),
        branding: { product_name: form.name.trim() },
        domains: form.domain ? [form.domain.trim()] : [],
        database: {
          host: form.host.trim(),
          db_user: form.db_user.trim(),
          db_password: form.db_password,
          db_name: form.db_name.trim(),
        },
      });
      setModalOpen(false);
      await swal({ icon: 'success', title: 'Product created', timer: 1400, showConfirmButton: false });
      load();
    } catch (err) {
      swal({ icon: 'error', title: 'Create failed', text: err.message });
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (slug, label, fn) => {
    setBusy(`${slug}:${label}`);
    try { await fn(); await load(); }
    catch (err) { swal({ icon: 'error', title: `${label} failed`, text: err.message }); }
    finally { setBusy(null); }
  };

  const toggleStatus = (p) =>
    runAction(p.slug, 'status', () =>
      p.status === 'active' ? disableProduct(p.slug) : updateProduct(p.slug, { status: 'active' })
    );

  const confirmDelete = async (p) => {
    const res = await swal({
      icon: 'warning', title: `Delete ${p.name}?`,
      text: 'Removes control-plane records. The tenant database is not dropped.',
      showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#ef4444',
    });
    if (res.isConfirmed) runAction(p.slug, 'delete', () => deleteProduct(p.slug));
  };

  const saveBranding = async (slug) => {
    await runAction(slug, 'branding', () => updateBranding(slug, editBrand));
    setEditBrand(null);
  };

  /* ── Shared class strings ── */
  const inputCls  = 'w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-indigo-400';
  const labelSpan = 'mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400';
  const actionBtn = 'flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors';

  /* ── Sidebar nav item ── */
  const NavItem = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => { setActiveNav(id); setSidebarOpen(false); }}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        activeNav === id
          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${activeNav === id ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
      {label}
      {activeNav === id && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60" />}
    </button>
  );

  /* ── Sidebar content ── */
  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-5 dark:border-gray-700">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
          <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
        </span>
        <div>
          <p className="font-display text-sm font-extrabold leading-none text-gray-900 dark:text-white">Platform Console</p>
          <p className="mt-0.5 text-[0.6rem] uppercase tracking-widest text-gray-400">Super Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <p className="mb-2 px-3 text-[0.6rem] font-bold uppercase tracking-widest text-gray-400">Navigation</p>
        {NAV_ITEMS.map((item) => <NavItem key={item.id} {...item} />)}
      </nav>

      <div className="border-t border-gray-200 p-3 dark:border-gray-700">
        <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 dark:bg-gray-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">SA</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">Super Admin</p>
            <p className="text-[0.6rem] text-gray-400">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">

      {/* Add Product Modal */}
      <AddProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateProduct}
        loading={creating}
      />

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Right Panel ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* ── Top Navbar ── */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="hidden items-center gap-1.5 text-sm sm:flex">
            <span className="font-semibold text-gray-900 dark:text-white">
              {NAV_ITEMS.find((n) => n.id === activeNav)?.label}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-400">Super Admin</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Add Product button */}
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Product</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark'
                ? <><Sun className="h-3.5 w-3.5 text-amber-500" /><span className="hidden sm:inline">Light mode</span></>
                : <><Moon className="h-3.5 w-3.5 text-indigo-500" /><span className="hidden sm:inline">Dark mode</span></>
              }
            </button>

            <button
              onClick={load}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* ── Scrollable body ── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* ══ OVERVIEW ══ */}
          {activeNav === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">Overview</h1>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Platform at a glance</p>
                </div>
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Product
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard label="Total Products" value={products.length}    icon={Box}       accent="bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400" />
                <StatCard label="Active"         value={activeCount}        icon={Activity}  accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" />
                <StatCard label="Total Users"    value={totalUsers || '—'}  icon={Users}     accent="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" />
                <StatCard label="Transactions"   value={totalTx || '—'}     icon={BarChart2} accent="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400" />
              </div>

              <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                  <h2 className="font-display text-sm font-bold text-gray-900 dark:text-white">Recent Products</h2>
                  <button onClick={() => setActiveNav('products')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                    View all →
                  </button>
                </div>
                {loading ? (
                  <div className="flex items-center gap-2 p-6 text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 p-10 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
                      <Box className="h-6 w-6 text-gray-400" />
                    </span>
                    <p className="text-sm text-gray-400">No products yet.</p>
                    <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">
                      <Plus className="h-3.5 w-3.5" /> Add your first product
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {products.slice(0, 6).map((p) => {
                      const stat = statFor(p.slug);
                      return (
                        <li key={p.slug} className="flex items-center gap-3 px-5 py-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{p.name}</p>
                            <p className="text-xs text-gray-400">/{p.slug}</p>
                          </div>
                          <div className="hidden gap-4 text-xs sm:flex">
                            <span className="text-gray-500 dark:text-gray-400">
                              <span className="font-semibold text-gray-900 dark:text-white">{stat?.users ?? '—'}</span> users
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              <span className="font-semibold text-gray-900 dark:text-white">{stat?.transactions ?? '—'}</span> tx
                            </span>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                            {p.status}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ══ PRODUCTS ══ */}
          {activeNav === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">Products</h1>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Manage and onboard products</p>
                </div>
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Product
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                  <h2 className="font-display text-sm font-bold text-gray-900 dark:text-white">
                    All Products
                    <span className="ml-2 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {products.length}
                    </span>
                  </h2>
                </div>

                {loading ? (
                  <div className="flex items-center gap-2 p-6 text-gray-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 p-10 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
                      <Box className="h-6 w-6 text-gray-400" />
                    </span>
                    <p className="text-sm text-gray-400">No products yet. Create your first one.</p>
                    <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">
                      <Plus className="h-3.5 w-3.5" /> Add Product
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {products.map((p) => {
                      const stat = statFor(p.slug);
                      return (
                        <li key={p.slug} className="p-5">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-black text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                              {p.name.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                              <p className="text-xs text-gray-400">/{p.slug}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                              {p.status}
                            </span>

                            <div className="ml-auto flex flex-wrap gap-2">
                              <button onClick={() => setEditBrand(editBrand?.slug === p.slug ? null : { slug: p.slug, ...p.branding })} className={actionBtn}>
                                <Palette className="h-3.5 w-3.5" /> Branding
                              </button>
                              <button onClick={() => runAction(p.slug, 'provision', () => provisionProduct(p.slug))} disabled={busy === `${p.slug}:provision`} className={actionBtn}>
                                {busy === `${p.slug}:provision` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />} Provision
                              </button>
                              <button onClick={() => toggleStatus(p)} disabled={busy === `${p.slug}:status`} className={actionBtn}>
                                <Power className="h-3.5 w-3.5" /> {p.status === 'active' ? 'Disable' : 'Enable'}
                              </button>
                              <button onClick={() => confirmDelete(p)} className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900/60">
                              <p className="flex items-center gap-1.5 font-medium text-gray-500 dark:text-gray-400"><Database className="h-3.5 w-3.5" /> Database</p>
                              <p className="mt-1 font-semibold text-gray-900 dark:text-white">{p.database.db_name ?? '—'}</p>
                              <p className={p.database.is_provisioned ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                {p.database.is_provisioned ? 'provisioned' : 'not provisioned'}
                              </p>
                            </div>
                            <div className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900/60">
                              <p className="flex items-center gap-1.5 font-medium text-gray-500 dark:text-gray-400"><Globe className="h-3.5 w-3.5" /> Domains</p>
                              <p className="mt-1 font-semibold text-gray-900 dark:text-white">{p.domains.map((d) => d.host).join(', ') || '—'}</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900/60">
                              <p className="flex items-center gap-1.5 font-medium text-gray-500 dark:text-gray-400"><Users className="h-3.5 w-3.5" /> Users</p>
                              <p className="mt-1 font-semibold text-gray-900 dark:text-white">{stat?.users ?? (stat?.error ? 'n/a' : '—')}</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900/60">
                              <p className="font-medium text-gray-500 dark:text-gray-400">Transactions</p>
                              <p className="mt-1 font-semibold text-gray-900 dark:text-white">{stat?.transactions ?? (stat?.error ? 'n/a' : '—')}</p>
                            </div>
                          </div>

                          {editBrand?.slug === p.slug && (
                            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                              <h3 className="mb-3 text-xs font-bold text-gray-700 dark:text-gray-300">Edit Branding</h3>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="text-xs">
                                  <span className={labelSpan}>Product name</span>
                                  <input value={editBrand.product_name} onChange={(e) => setEditBrand({ ...editBrand, product_name: e.target.value })} className={inputCls} />
                                </label>
                                <label className="text-xs">
                                  <span className={labelSpan}>Logo URL</span>
                                  <input value={editBrand.logo_url || ''} onChange={(e) => setEditBrand({ ...editBrand, logo_url: e.target.value })} className={inputCls} />
                                </label>
                                <label className="text-xs">
                                  <span className={labelSpan}>Support email</span>
                                  <input value={editBrand.support_email || ''} onChange={(e) => setEditBrand({ ...editBrand, support_email: e.target.value })} className={inputCls} />
                                </label>
                                <label className="text-xs">
                                  <span className={labelSpan}>Support phone</span>
                                  <input value={editBrand.support_phone || ''} onChange={(e) => setEditBrand({ ...editBrand, support_phone: e.target.value })} className={inputCls} />
                                </label>
                                <div className="flex justify-end gap-2 sm:col-span-2">
                                  <button onClick={() => setEditBrand(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                                    Cancel
                                  </button>
                                  <button onClick={() => saveBranding(p.slug)} disabled={busy === `${p.slug}:branding`} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                                    Save branding
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ══ ANALYTICS ══ */}
          {activeNav === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Usage metrics across all products</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Total Products"     value={products.length}   icon={Box}       accent="bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400" />
                <StatCard label="Total Users"        value={totalUsers || '—'} icon={Users}     accent="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" />
                <StatCard label="Total Transactions" value={totalTx || '—'}    icon={BarChart2} accent="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400" />
              </div>

              <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                  <h2 className="font-display text-sm font-bold text-gray-900 dark:text-white">Per-product breakdown</h2>
                </div>
                {loading ? (
                  <div className="flex items-center gap-2 p-6 text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Product</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Users</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Transactions</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">DB</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {products.map((p) => {
                          const stat = statFor(p.slug);
                          return (
                            <tr key={p.slug} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                                    {p.name.charAt(0).toUpperCase()}
                                  </span>
                                  <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                    <p className="text-xs text-gray-400">/{p.slug}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-right font-semibold text-gray-900 dark:text-white">{stat?.users ?? (stat?.error ? 'n/a' : '—')}</td>
                              <td className="px-5 py-3.5 text-right font-semibold text-gray-900 dark:text-white">{stat?.transactions ?? (stat?.error ? 'n/a' : '—')}</td>
                              <td className="px-5 py-3.5 text-right">
                                <span className={`text-xs font-semibold ${p.database.is_provisioned ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                  {p.database.is_provisioned ? 'Ready' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <span className={`rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {products.length === 0 && (
                          <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No data yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
