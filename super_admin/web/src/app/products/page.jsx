'use client';

import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
  Box, CheckCircle2, Database, Eye, EyeOff, Globe, Loader2,
  MinusCircle, Palette, Pencil, Plus, Power, Server, Trash2, Wifi, X, XCircle,
  Check, Circle, Paintbrush,
} from 'lucide-react';
import {
  listProducts, disableProduct, updateProduct, deleteProduct,
  provisionProduct, updateUrls, updateDatabase, testConnection,
  getProductThemes, activateProductTheme, setProductThemeEnabled,
  getBranding, updateBranding,
} from '@/services/api';
import { useTheme } from '../providers';
import DashboardLayout, { useDashboard } from '../components/DashboardLayout';

function swalThemed(opts, theme) {
  const isDark = theme === 'dark';
  return Swal.fire({
    background: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#f1f5f9' : '#111827',
    confirmButtonColor: '#4f46e5',
    ...opts,
  });
}

/* ── shared status badge ── */
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

/* ── Edit Product Modal ── */
const EMPTY_TEST = { fe_url: null, be_url: null, database: null };
const EMPTY_MSGS = { fe_url: '',   be_url: '',   database: ''   };
const CONN_FIELDS = new Set(['fe_url', 'be_url', 'db_host', 'db_user', 'db_password', 'db_name']);

function EditProductModal({ product, onClose, onSaved, theme }) {
  const swal = (opts) => swalThemed(opts, theme);

  const [form, setForm] = useState({
    name:        product.name,
    slug:        product.slug,
    fe_url:      product.urls?.fe_url  || '',
    be_url:      product.urls?.be_url  || '',
    db_host:     product.database?.db_host || '',
    db_user:     product.database?.db_user || '',
    db_password: '',
    db_name:     product.database?.db_name || '',
  });
  const [testStatus, setTestStatus] = useState(EMPTY_TEST);
  const [testMsgs,   setTestMsgs]   = useState(EMPTY_MSGS);
  const [testing,    setTesting]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [showPass,   setShowPass]   = useState(false);

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
      type:        'database',
      db_host:     form.db_host.trim(),
      db_port:     '3306',
      db_user:     form.db_user.trim(),
      db_password: form.db_password,
      db_name:     form.db_name.trim(),
    });

    setTesting(false);
  };

  const handleSave = async () => {
    if (!allPassed) return;
    setSaving(true);
    try {
      const calls = [
        updateProduct(product.slug, { name: form.name.trim(), slug: form.slug.trim().toLowerCase() }),
        updateUrls(product.slug, { fe_url: form.fe_url.trim(), be_url: form.be_url.trim() }),
        updateDatabase(product.slug, {
          db_host:     form.db_host.trim(),
          db_user:     form.db_user.trim(),
          db_name:     form.db_name.trim(),
          ...(form.db_password ? { db_password: form.db_password } : {}),
        }),
      ];
      await Promise.all(calls);
      onSaved();
    } catch (err) {
      swal({ icon: 'error', title: 'Save failed', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none ' +
    'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ' +
    'dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-400';
  const labelCls = 'mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400';

  const fields = [
    { key: 'name',        label: 'Product Name',  placeholder: 'My Platform',                type: 'text',     span: false, statusKey: null       },
    { key: 'slug',        label: 'Slug',           placeholder: 'my-platform',                type: 'text',     span: false, statusKey: null       },
    { key: 'fe_url',      label: 'Frontend URL',   placeholder: 'https://myplatform.com',     type: 'text',     span: true,  statusKey: 'fe_url'   },
    { key: 'be_url',      label: 'Backend URL',    placeholder: 'https://api.myplatform.com', type: 'text',     span: true,  statusKey: 'be_url'   },
    { key: 'db_host',     label: 'DB Host',        placeholder: 'db.example.com',             type: 'text',     span: false, statusKey: null       },
    { key: 'db_user',     label: 'DB User',        placeholder: 'db_username',                type: 'text',     span: false, statusKey: null       },
    { key: 'db_password', label: 'DB Password',    placeholder: 'Enter to test & update',     type: 'password', span: false, statusKey: null       },
    { key: 'db_name',     label: 'Database Name',  placeholder: 'myplatform_db',              type: 'text',     span: false, statusKey: 'database' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Pencil className="h-4 w-4 text-white" />
            </span>
            <div>
              <h2 className="font-display text-sm font-bold text-gray-900 dark:text-white">
                Edit — {product.name}
              </h2>
              <p className="text-xs text-gray-400">/{product.slug} · Test connection then save</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(({ key, label, placeholder, type, span, statusKey }) => {
              const isPassword = key === 'db_password';
              return (
                <div key={key} className={`${span ? 'sm:col-span-2' : ''} text-sm`}>
                  <label htmlFor={`e-${key}`} className={labelCls}>{label}</label>
                  <div className={isPassword ? 'relative' : undefined}>
                    <input
                      id={`e-${key}`}
                      type={isPassword ? (showPass ? 'text' : 'password') : type}
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
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

          {/* Result banner */}
          {(testStatus.fe_url || testStatus.be_url || testStatus.database) && !allPassed && !testing && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              One or more checks failed. Fix the issue and run Test Connection again.
            </div>
          )}
          {allPassed && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              All checks passed — you can now save changes.
            </div>
          )}

          <div className="my-4 border-t border-gray-100 dark:border-gray-700" />

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
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
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const EMPTY_BRANDING = {
  product_name: '',
  logo_url: '',
  favicon_url: '',
  theme_color: '#ff9800',
  secondary_color: '#a78bfa',
  splash_url: '',
  app_icon_url: '',
  support_email: '',
  support_phone: '',
  terms_url: '',
  privacy_url: '',
};

/* ── Branding Modal ── */
function BrandingModal({ product, onClose, onSaved, theme }) {
  const swal = (opts) => swalThemed(opts, theme);

  const [form, setForm] = useState(EMPTY_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getBranding(product.slug);
        if (!cancelled) {
          setForm({
            product_name: data.product_name || product.name,
            logo_url: data.logo_url || '',
            favicon_url: data.favicon_url || '',
            theme_color: data.theme_color || '#ff9800',
            secondary_color: data.secondary_color || '#a78bfa',
            splash_url: data.splash_url || '',
            app_icon_url: data.app_icon_url || '',
            support_email: data.support_email || '',
            support_phone: data.support_phone || '',
            terms_url: data.terms_url || '',
            privacy_url: data.privacy_url || '',
          });
        }
      } catch (e) {
        if (!cancelled) swal({ icon: 'error', title: 'Failed to load branding', text: e.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.slug]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.product_name.trim()) {
      swal({ icon: 'warning', title: 'Product name is required' });
      return;
    }
    setSaving(true);
    try {
      await updateBranding(product.slug, {
        ...form,
        product_name: form.product_name.trim(),
      });
      onSaved?.();
      onClose();
    } catch (e) {
      swal({ icon: 'error', title: 'Save failed', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none ' +
    'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ' +
    'dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-400';
  const labelCls = 'mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400';

  const fields = [
    { key: 'product_name', label: 'Display Name', placeholder: 'Dollara', type: 'text', span: true },
    { key: 'logo_url', label: 'Logo URL', placeholder: 'https://cdn.example.com/logo.png', type: 'url', span: true },
    { key: 'favicon_url', label: 'Favicon URL', placeholder: 'https://cdn.example.com/favicon.ico', type: 'url', span: true },
    { key: 'theme_color', label: 'Primary Color', placeholder: '#ff9800', type: 'color', span: false },
    { key: 'secondary_color', label: 'Secondary Color', placeholder: '#a78bfa', type: 'color', span: false },
    { key: 'splash_url', label: 'Splash Image URL', placeholder: 'https://cdn.example.com/splash.png', type: 'url', span: true },
    { key: 'app_icon_url', label: 'App Icon URL', placeholder: 'https://cdn.example.com/icon.png', type: 'url', span: true },
    { key: 'support_email', label: 'Support Email', placeholder: 'support@example.com', type: 'email', span: false },
    { key: 'support_phone', label: 'Support Phone', placeholder: '+91 98765 43210', type: 'text', span: false },
    { key: 'terms_url', label: 'Terms URL', placeholder: 'https://example.com/terms', type: 'url', span: true },
    { key: 'privacy_url', label: 'Privacy URL', placeholder: 'https://example.com/privacy', type: 'url', span: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Paintbrush className="h-4 w-4 text-white" />
            </span>
            <div>
              <h2 className="font-display text-sm font-bold text-gray-900 dark:text-white">
                Branding — {product.name}
              </h2>
              <p className="text-xs text-gray-400">White-label name, colors, and asset URLs</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-gray-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading branding…</div>
          ) : (
            <>
              <div className="mb-5 flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/60">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="" className="h-12 w-12 rounded-xl object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-black text-white"
                    style={{ background: `linear-gradient(135deg, ${form.theme_color}, ${form.secondary_color})` }}
                  >
                    {(form.product_name || product.name).charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-bold text-gray-900 dark:text-white">{form.product_name || product.name}</p>
                  <p className="text-xs text-gray-400">Live preview of brand colors and display name</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map(({ key, label, placeholder, type, span }) => (
                  <div key={key} className={`${span ? 'sm:col-span-2' : ''} text-sm`}>
                    <label htmlFor={`b-${key}`} className={labelCls}>{label}</label>
                    {type === 'color' ? (
                      <div className="flex items-center gap-3">
                        <input
                          id={`b-${key}`}
                          type="color"
                          value={form[key]}
                          onChange={set(key)}
                          className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 bg-transparent p-1 dark:border-gray-600"
                        />
                        <input
                          type="text"
                          value={form[key]}
                          onChange={set(key)}
                          placeholder={placeholder}
                          className={inputCls}
                        />
                      </div>
                    ) : (
                      <input
                        id={`b-${key}`}
                        type={type === 'url' ? 'url' : type}
                        value={form[key]}
                        onChange={set(key)}
                        placeholder={placeholder}
                        className={inputCls}
                      />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-700">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paintbrush className="h-4 w-4" />}
            Save Branding
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Themes Modal ──
   Per-product Themes table. All catalog themes appear as rows; exactly one is the
   live (active) theme. Activating a theme deactivates the rest. A theme can be
   enabled/disabled to control whether it may be activated. */
function ThemesModal({ product, onClose, onSaved, theme }) {
  const swal = (opts) => swalThemed(opts, theme);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProductThemes(product.slug);
      setRows(res.themes || []);
    } catch (e) {
      swal({ icon: 'error', title: 'Failed to load themes', text: e.message });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.slug]);

  useEffect(() => { load(); }, [load]);

  const activate = async (key) => {
    setBusyKey(`${key}:activate`);
    try {
      const res = await activateProductTheme(product.slug, key);
      setRows(res.themes || []);
      onSaved?.();
    } catch (e) {
      swal({ icon: 'error', title: 'Activate failed', text: e.message });
    } finally {
      setBusyKey(null);
    }
  };

  const toggleEnabled = async (key, next) => {
    setBusyKey(`${key}:enabled`);
    try {
      const res = await setProductThemeEnabled(product.slug, key, next);
      setRows(res.themes || []);
      onSaved?.();
    } catch (e) {
      swal({ icon: 'error', title: 'Update failed', text: e.message });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Palette className="h-4 w-4 text-white" />
            </span>
            <div>
              <h2 className="font-display text-sm font-bold text-gray-900 dark:text-white">
                Themes — {product.name}
              </h2>
              <p className="text-xs text-gray-400">Activate one theme as live; enable/disable the rest</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-gray-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading themes…</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                    <th className="px-4 py-3">Theme</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.map((t) => {
                    const activating = busyKey === `${t.theme_key}:activate`;
                    const togglingEnabled = busyKey === `${t.theme_key}:enabled`;
                    return (
                      <tr key={t.theme_key} className={t.is_active ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''}>
                        {/* Theme */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black ${t.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'}`}>
                              {t.theme_key.replace(/\D/g, '') || t.name.charAt(0)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900 dark:text-white">{t.name}</p>
                              <p className="truncate text-xs text-gray-400">{t.description || t.theme_key}</p>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {t.is_active ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" /> Live
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                <Circle className="h-3 w-3" /> Inactive
                              </span>
                            )}
                            {!t.is_enabled && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                Disabled
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {t.is_active ? (
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:border-emerald-900 dark:text-emerald-400">
                                <Check className="h-3.5 w-3.5" /> Active
                              </span>
                            ) : (
                              <button
                                onClick={() => activate(t.theme_key)}
                                disabled={!t.is_enabled || activating || togglingEnabled}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                              >
                                {activating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => toggleEnabled(t.theme_key, !t.is_enabled)}
                              disabled={t.is_active || activating || togglingEnabled}
                              title={t.is_active ? 'Deactivate it first to disable' : (t.is_enabled ? 'Disable' : 'Enable')}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                            >
                              {togglingEnabled ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                              {t.is_enabled ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex items-center justify-end">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Products page ── */
function ProductsContent() {
  const { refreshKey, openAddModal } = useDashboard();
  const { theme } = useTheme();

  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [busy,        setBusy]        = useState(null);
  const [editTarget,     setEditTarget]     = useState(null);
  const [themeTarget,    setThemeTarget]    = useState(null);
  const [brandingTarget, setBrandingTarget] = useState(null);

  const swal = (opts) => swalThemed(opts, theme);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProducts(await listProducts()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const toggleStatus = async (p) => {
    setBusy(`${p.slug}:status`);
    try {
      await (p.status === 'active' ? disableProduct(p.slug) : updateProduct(p.slug, { status: 'active' }));
      await load();
    } catch (err) {
      swal({ icon: 'error', title: 'Status update failed', text: err.message });
    } finally { setBusy(null); }
  };

  const confirmDelete = async (p) => {
    const res = await swal({
      icon: 'warning', title: `Delete ${p.name}?`,
      text: 'Removes control-plane records. The tenant database is not dropped.',
      showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#ef4444',
    });
    if (!res.isConfirmed) return;
    setBusy(`${p.slug}:delete`);
    try { await deleteProduct(p.slug); await load(); }
    catch (err) { swal({ icon: 'error', title: 'Delete failed', text: err.message }); }
    finally { setBusy(null); }
  };

  const actionBtn = 'flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors';

  return (
    <>
      {editTarget && (
        <EditProductModal
          product={editTarget}
          theme={theme}
          onClose={() => setEditTarget(null)}
          onSaved={async () => { setEditTarget(null); await load(); }}
        />
      )}

      {themeTarget && (
        <ThemesModal
          product={themeTarget}
          theme={theme}
          onClose={() => setThemeTarget(null)}
          // Refresh the product list (Live Theme card) after each change, but keep
          // the modal open so the operator can make several changes in one sitting.
          onSaved={() => { load(); }}
        />
      )}

      {brandingTarget && (
        <BrandingModal
          product={brandingTarget}
          theme={theme}
          onClose={() => setBrandingTarget(null)}
          onSaved={() => { load(); }}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">Products</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Manage and onboard products</p>
          </div>
          <button onClick={openAddModal} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition-colors">
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
              <button onClick={openAddModal} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">
                <Plus className="h-3.5 w-3.5" /> Add Product
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {products.map((p) => (
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
                      <button onClick={() => setEditTarget(p)} className={actionBtn}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button onClick={() => setBrandingTarget(p)} className={actionBtn}>
                        <Paintbrush className="h-3.5 w-3.5" /> Branding
                      </button>
                      <button onClick={() => setThemeTarget(p)} className={actionBtn}>
                        <Palette className="h-3.5 w-3.5" /> Themes
                      </button>
                      <button
                        onClick={() => {
                          setBusy(`${p.slug}:provision`);
                          provisionProduct(p.slug).then(load)
                            .catch((e) => swal({ icon: 'error', title: 'Provision failed', text: e.message }))
                            .finally(() => setBusy(null));
                        }}
                        disabled={busy === `${p.slug}:provision`}
                        className={actionBtn}
                      >
                        {busy === `${p.slug}:provision` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />} Provision
                      </button>
                      <button onClick={() => toggleStatus(p)} disabled={busy === `${p.slug}:status`} className={actionBtn}>
                        <Power className="h-3.5 w-3.5" /> {p.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => confirmDelete(p)} disabled={busy === `${p.slug}:delete`} className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-50 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>

                  {/* Info cards */}
                  <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900/60">
                      <p className="flex items-center gap-1.5 font-medium text-gray-500 dark:text-gray-400">
                        <Paintbrush className="h-3.5 w-3.5" /> Brand
                      </p>
                      <p className="mt-1 font-semibold text-gray-900 dark:text-white">{p.branding?.product_name || p.name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full border border-gray-200 dark:border-gray-600" style={{ background: p.branding?.theme_color || '#ff9800' }} />
                        <span className="h-3 w-3 rounded-full border border-gray-200 dark:border-gray-600" style={{ background: p.branding?.secondary_color || '#a78bfa' }} />
                      </div>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900/60">
                      <p className="flex items-center gap-1.5 font-medium text-gray-500 dark:text-gray-400">
                        <Palette className="h-3.5 w-3.5" /> Live Theme
                      </p>
                      <p className="mt-1 font-semibold text-gray-900 dark:text-white">{p.active_theme || '—'}</p>
                      <p className="text-gray-400">{(p.themes?.filter((t) => t.is_enabled).length ?? 0)} enabled</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900/60">
                      <p className="flex items-center gap-1.5 font-medium text-gray-500 dark:text-gray-400">
                        <Database className="h-3.5 w-3.5" /> Database
                      </p>
                      <p className="mt-1 font-semibold text-gray-900 dark:text-white">{p.database?.db_name ?? '—'}</p>
                      <p className={p.database?.is_provisioned ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                        {p.database?.is_provisioned ? 'provisioned' : 'not provisioned'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900/60">
                      <p className="flex items-center gap-1.5 font-medium text-gray-500 dark:text-gray-400">
                        <Globe className="h-3.5 w-3.5" /> Frontend URL
                      </p>
                      <p className="mt-1 truncate font-semibold text-gray-900 dark:text-white">{p.urls?.fe_url || '—'}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900/60">
                      <p className="flex items-center gap-1.5 font-medium text-gray-500 dark:text-gray-400">
                        <Server className="h-3.5 w-3.5" /> Backend URL
                      </p>
                      <p className="mt-1 truncate font-semibold text-gray-900 dark:text-white">{p.urls?.be_url || '—'}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

export default function ProductsPage() {
  return (
    <DashboardLayout>
      <ProductsContent />
    </DashboardLayout>
  );
}
