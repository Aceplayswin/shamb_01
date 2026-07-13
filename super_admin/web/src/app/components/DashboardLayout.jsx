'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import {
  ShieldCheck, LogOut, Plus, Loader2,
  RefreshCw, Sun, Moon, LayoutDashboard, Box, ChevronRight, Menu, X,
  Wifi, CheckCircle2, XCircle, MinusCircle, Eye, EyeOff,
} from 'lucide-react';
import { getSuperAdminToken, clearSuperAdminToken, createProduct, testConnection } from '@/services/api';
import { useTheme } from '../providers';

const DashboardCtx = createContext({ refreshKey: 0, openAddModal: () => {} });
export const useDashboard = () => useContext(DashboardCtx);

const NAV_ITEMS = [
  { label: 'Overview',  icon: LayoutDashboard, href: '/' },
  { label: 'Products',  icon: Box,             href: '/products' },
];

const EMPTY_FORM = {
  name: '',
  fe_url: '', be_url: '',
  db_host: '', db_user: '', db_password: '', db_name: '',
};
const EMPTY_TEST  = { fe_url: null, be_url: null, database: null };
const EMPTY_MSGS  = { fe_url: '',   be_url: '',   database: ''   };
const CONN_FIELDS = new Set(['fe_url', 'be_url', 'db_host', 'db_user', 'db_password', 'db_name']);

function swalThemed(opts, theme) {
  const isDark = theme === 'dark';
  return Swal.fire({
    background: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#f1f5f9' : '#111827',
    confirmButtonColor: '#4f46e5',
    ...opts,
  });
}

function StatusBadge({ status, message }) {
  if (!status) return null;
  const cfg = {
    checking: { cls: 'text-blue-500 dark:text-blue-400',       icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    ok:       { cls: 'text-emerald-600 dark:text-emerald-400', icon: <CheckCircle2 className="h-3 w-3" /> },
    skipped:  { cls: 'text-gray-400 dark:text-gray-500',       icon: <MinusCircle className="h-3 w-3" /> },
    error:    { cls: 'text-red-500 dark:text-red-400',         icon: <XCircle className="h-3 w-3" /> },
  }[status] || { cls: '', icon: null };
  return (
    <span className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.icon} {message}
    </span>
  );
}

function AddProductModal({ open, onClose, onSubmit, loading }) {
  const [form,        setForm]       = useState(EMPTY_FORM);
  const [testStatus,  setTestStatus] = useState(EMPTY_TEST);
  const [testMsgs,    setTestMsgs]   = useState(EMPTY_MSGS);
  const [testing,     setTesting]    = useState(false);
  const [showPass,    setShowPass]   = useState(false);

  const allPassed =
    (testStatus.fe_url   === 'ok' || testStatus.fe_url   === 'skipped') &&
    (testStatus.be_url   === 'ok' || testStatus.be_url   === 'skipped') &&
    testStatus.database === 'ok';

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (CONN_FIELDS.has(k)) {
      setTestStatus(EMPTY_TEST);
      setTestMsgs(EMPTY_MSGS);
    }
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setTestStatus(EMPTY_TEST);
    setTestMsgs(EMPTY_MSGS);
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (allPassed) onSubmit(form);
  };

  const runStep = async (statusKey, payload) => {
    setTestStatus((s) => ({ ...s, [statusKey]: 'checking' }));
    try {
      const res = await testConnection(payload);
      setTestStatus((s) => ({ ...s, [statusKey]: res.status }));
      setTestMsgs((s)   => ({ ...s, [statusKey]: res.message }));
      return res.status;
    } catch (e) {
      setTestStatus((s) => ({ ...s, [statusKey]: 'error' }));
      setTestMsgs((s)   => ({ ...s, [statusKey]: e.message }));
      return 'error';
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestStatus(EMPTY_TEST);
    setTestMsgs(EMPTY_MSGS);

    // Step 1 — Frontend URL
    if (form.fe_url.trim()) {
      const r = await runStep('fe_url', { type: 'fe_url', url: form.fe_url.trim() });
      if (r === 'error') { setTesting(false); return; }
    } else {
      setTestStatus((s) => ({ ...s, fe_url: 'skipped' }));
      setTestMsgs((s)   => ({ ...s, fe_url: 'Not provided, skipped' }));
    }

    // Step 2 — Backend URL
    if (form.be_url.trim()) {
      const r = await runStep('be_url', { type: 'be_url', url: form.be_url.trim() });
      if (r === 'error') { setTesting(false); return; }
    } else {
      setTestStatus((s) => ({ ...s, be_url: 'skipped' }));
      setTestMsgs((s)   => ({ ...s, be_url: 'Not provided, skipped' }));
    }

    // Step 3 — Database
    await runStep('database', {
      type: 'database',
      db_host:     form.db_host.trim(),
      db_port:     '3306',
      db_user:     form.db_user.trim(),
      db_password: form.db_password,
      db_name:     form.db_name.trim(),
    });

    setTesting(false);
  };

  if (!open) return null;

  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none ' +
    'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ' +
    'dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-400';
  const labelCls = 'mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400';

  const fields = [
    { key: 'name',        label: 'Product Name',  placeholder: 'My Platform',                type: 'text',     span: true,  statusKey: null       },
    { key: 'fe_url',      label: 'Frontend URL',   placeholder: 'https://myplatform.com',     type: 'text',     span: true,  statusKey: 'fe_url' },
    { key: 'be_url',      label: 'Backend URL',    placeholder: 'https://api.myplatform.com', type: 'text',     span: true,  statusKey: 'be_url' },
    { key: 'db_host',     label: 'DB Host',        placeholder: 'db.example.com',             type: 'text',     span: false, statusKey: null       },
    { key: 'db_user',     label: 'DB User',        placeholder: 'db_username',                type: 'text',     span: false, statusKey: null       },
    { key: 'db_password', label: 'DB Password',    placeholder: '••••••••',                   type: 'password', span: false, statusKey: null       },
    { key: 'db_name',     label: 'Database Name',  placeholder: 'myplatform_db',              type: 'text',     span: false, statusKey: 'database' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Plus className="h-4 w-4 text-white" />
            </span>
            <div>
              <h2 className="font-display text-sm font-bold text-gray-900 dark:text-white">Add New Product</h2>
              <p className="text-xs text-gray-400">Fill in the details to onboard a product</p>
            </div>
          </div>
          <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(({ key, label, placeholder, type, span, statusKey }) => {
              const isPassword = key === 'db_password';
              return (
                <div key={key} className={`${span ? 'sm:col-span-2' : ''} text-sm`}>
                  <label htmlFor={`f-${key}`} className={labelCls}>{label}</label>
                  <div className={isPassword ? 'relative' : undefined}>
                    <input
                      id={`f-${key}`}
                      type={isPassword ? (showPass ? 'text' : 'password') : type}
                      required={['name', 'db_host', 'db_user', 'db_password', 'db_name'].includes(key)}
                      value={form[key]}
                      onChange={set(key)}
                      placeholder={placeholder}
                      autoComplete={isPassword ? 'new-password' : 'off'}
                      className={isPassword ? `${inputCls} pr-10` : inputCls}
                    />
                    {isPassword && (
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        tabIndex={-1}
                      >
                        {showPass
                          ? <EyeOff className="h-4 w-4" />
                          : <Eye className="h-4 w-4" />
                        }
                      </button>
                    )}
                  </div>
                  {statusKey && (
                    <StatusBadge status={testStatus[statusKey]} message={testMsgs[statusKey]} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Test summary banner */}
          {(testStatus.fe_url || testStatus.be_url || testStatus.database) && !allPassed && !testing && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              One or more checks failed. Fix the issue and run Test Connection again.
            </div>
          )}
          {allPassed && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              All checks passed — you can now create the product.
            </div>
          )}

          <div className="my-4 border-t border-gray-100 dark:border-gray-700" />

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={handleClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {testing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Testing…</>
                : <><Wifi className="h-4 w-4" /> Test Connection</>
              }
            </button>
            {allPassed && (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Product
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [creating,    setCreating]    = useState(false);
  const [refreshKey,  setRefreshKey]  = useState(0);

  const swal = (opts) => swalThemed(opts, theme);

  useEffect(() => {
    if (!getSuperAdminToken()) router.replace('/login');
  }, [router]);

  const logout = () => { clearSuperAdminToken(); router.replace('/login'); };
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const openAddModal = useCallback(() => setModalOpen(true), []);

  const handleCreateProduct = async (form) => {
    setCreating(true);
    try {
      await createProduct({
        name: form.name.trim(),
        urls: {
          fe_url: form.fe_url.trim(),
          be_url: form.be_url.trim(),
        },
        database: {
          db_host:     form.db_host.trim(),
          db_user:     form.db_user.trim(),
          db_password: form.db_password,
          db_name:     form.db_name.trim(),
        },
      });
      setModalOpen(false);
      await swal({ icon: 'success', title: 'Product created', timer: 1400, showConfirmButton: false });
      refresh();
    } catch (err) {
      swal({ icon: 'error', title: 'Create failed', text: err.message });
    } finally {
      setCreating(false);
    }
  };

  const activeLabel = NAV_ITEMS.find((n) => n.href === pathname)?.label ?? 'Dashboard';

  const NavItem = ({ label, icon: Icon, href }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        onClick={() => setSidebarOpen(false)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
        {label}
        {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60" />}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
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
        {NAV_ITEMS.map((item) => <NavItem key={item.href} {...item} />)}
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
    <DashboardCtx.Provider value={{ refreshKey, refresh, openAddModal }}>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
        <AddProductModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreateProduct} loading={creating} />

        {/* Desktop Sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:flex lg:flex-col">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 border-r border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
              <button onClick={() => setSidebarOpen(false)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-4 w-4" />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* Right panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6 dark:border-gray-800 dark:bg-gray-900">
            <button onClick={() => setSidebarOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden">
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden items-center gap-1.5 text-sm sm:flex">
              <span className="font-semibold text-gray-900 dark:text-white">{activeLabel}</span>
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-gray-400">Super Admin</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={toggle} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors" title="Toggle theme">
                {theme === 'dark'
                  ? <><Sun className="h-3.5 w-3.5 text-amber-500" /><span className="hidden sm:inline">Light mode</span></>
                  : <><Moon className="h-3.5 w-3.5 text-indigo-500" /><span className="hidden sm:inline">Dark mode</span></>
                }
              </button>
              <button onClick={refresh} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors">
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button onClick={logout} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </DashboardCtx.Provider>
  );
}
