'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'bn', label: 'বাংলা (Bengali)' },
  { value: 'te', label: 'తెలుగు (Telugu)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
];

const CURRENCIES = [
  { value: 'INR', label: '₹ INR — Indian Rupee' },
  { value: 'USD', label: '$ USD — US Dollar' },
  { value: 'EUR', label: '€ EUR — Euro' },
  { value: 'USDT', label: '₮ USDT — Tether' },
];

const DEFAULTS = {
  website_language: 'en',
  communication_language: 'en',
  currency: 'INR',
  notifications_enabled: true,
  marketing_opt_in: false,
};

export default function Theme1Settings() {
  const router = useRouter();
  const { token, refreshSession, logout } = useAuthStore();

  const [form, setForm] = useState(DEFAULTS);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'ok' | 'err', text }

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    let active = true;
    api('/api/v1/settings')
      .then((data) => {
        if (!active) return;
        setForm({
          website_language: data.website_language ?? DEFAULTS.website_language,
          communication_language:
            data.communication_language ?? DEFAULTS.communication_language,
          currency: data.currency ?? DEFAULTS.currency,
          notifications_enabled:
            data.notifications_enabled ?? DEFAULTS.notifications_enabled,
          marketing_opt_in: data.marketing_opt_in ?? DEFAULTS.marketing_opt_in,
        });
        setAccount(data);
      })
      .catch((e) => setStatus({ type: 'err', text: e.message }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token, router]);

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus(null);
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const data = await api('/api/v1/settings', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setAccount(data);
      setStatus({ type: 'ok', text: 'Settings saved' });
      refreshSession();
    } catch (e) {
      setStatus({ type: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!token) return null;

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-slate-400">
        Manage your preferences and account.
      </p>

      {loading ? (
        <div className="mt-8 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-glass h-24 animate-pulse opacity-60" />
          ))}
        </div>
      ) : (
        <>
          {/* ---- Preferences ---- */}
          <section className="mt-6 card-glass p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Preferences
            </h2>
            <div className="mt-4 space-y-5">
              <Field label="Website language" hint="Language used across the site">
                <Select
                  value={form.website_language}
                  onChange={(v) => update('website_language', v)}
                  options={LANGUAGES}
                />
              </Field>

              <Field
                label="Communication language"
                hint="Used for notifications, emails & support"
              >
                <Select
                  value={form.communication_language}
                  onChange={(v) => update('communication_language', v)}
                  options={LANGUAGES}
                />
              </Field>

              <Field label="Currency" hint="Display currency for balances">
                <Select
                  value={form.currency}
                  onChange={(v) => update('currency', v)}
                  options={CURRENCIES}
                />
              </Field>
            </div>
          </section>

          {/* ---- Notifications ---- */}
          <section className="mt-5 card-glass p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Notifications
            </h2>
            <div className="mt-4 space-y-1">
              <Toggle
                label="Push & in-app notifications"
                hint="Bet results, deposits, withdrawals and account alerts"
                checked={form.notifications_enabled}
                onChange={(v) => update('notifications_enabled', v)}
              />
              <Toggle
                label="Promotional offers"
                hint="Bonuses, campaigns and marketing updates"
                checked={form.marketing_opt_in}
                onChange={(v) => update('marketing_opt_in', v)}
                last
              />
            </div>
          </section>

          {/* ---- Account (read-only) ---- */}
          <section className="mt-5 card-glass p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Account
            </h2>
            <div className="mt-4 space-y-1">
              <Row label="Full name" value={account?.full_name} />
              <Row label="Username" value={account?.username} />
              <Row label="Phone" value={account?.phone} />
              <Row label="Email" value={account?.email} />
              <Row label="KYC status" value={account?.kyc_status} badge />
              <Row label="Account status" value={account?.account_status} badge last />
            </div>
          </section>

          {/* ---- Security ---- */}
          <ChangePassword />

          {/* ---- Save bar ---- */}
          <div className="sticky bottom-4 z-10 mt-6">
            {status && (
              <p
                className={`mb-2 text-center text-sm ${
                  status.type === 'ok' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {status.text}
              </p>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full rounded-xl bg-brand-500 py-4 font-semibold text-surface-900 shadow-lg shadow-brand-500/20 transition hover:bg-brand-400 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          <button
            type="button"
            onClick={logout}
            className="mt-4 w-full rounded-xl border border-red-500/30 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
          >
            Logout
          </button>
        </>
      )}
    </main>
  );
}

/* ----------------------------- Change password ---------------------------- */

const EMPTY_PASSWORDS = { current: '', next: '', confirm: '' };

function ChangePassword() {
  const [form, setForm] = useState(EMPTY_PASSWORDS);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) {
      setStatus({ type: 'err', text: 'New passwords do not match' });
      return;
    }
    if (form.next.length < 6) {
      setStatus({ type: 'err', text: 'New password must be at least 6 characters' });
      return;
    }
    setSaving(true);
    try {
      await api('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: form.current,
          newPassword: form.next,
        }),
      });
      setForm(EMPTY_PASSWORDS);
      setStatus({ type: 'ok', text: 'Password changed' });
    } catch (err) {
      setStatus({ type: 'err', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-5 card-glass p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Security
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Change the password you use to sign in.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <PasswordField
          label="Current password"
          value={form.current}
          autoComplete="current-password"
          onChange={(v) => set('current', v)}
        />
        <PasswordField
          label="New password"
          value={form.next}
          autoComplete="new-password"
          onChange={(v) => set('next', v)}
        />
        <PasswordField
          label="Confirm new password"
          value={form.confirm}
          autoComplete="new-password"
          onChange={(v) => set('confirm', v)}
        />

        {status && (
          <p
            className={`text-sm ${
              status.type === 'ok' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {status.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !form.current || !form.next || !form.confirm}
          className="w-full rounded-xl border border-white/15 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-50"
        >
          {saving ? 'Updating…' : 'Change password'}
        </button>
      </form>
    </section>
  );
}

function PasswordField({ label, value, onChange, autoComplete }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white">{label}</label>
      <input
        type="password"
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white outline-none transition focus:border-brand-500/60"
      />
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white outline-none transition focus:border-brand-500/60"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({ label, hint, checked, onChange, last }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3 ${
        last ? '' : 'border-b border-white/5'
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${
          checked ? 'bg-brand-500' : 'bg-surface-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function Row({ label, value, badge, last }) {
  return (
    <div
      className={`flex items-center justify-between py-2.5 ${
        last ? '' : 'border-b border-white/5'
      }`}
    >
      <span className="text-slate-400">{label}</span>
      {badge ? (
        <StatusBadge value={value} />
      ) : (
        <span className="text-right text-white">{value ?? '—'}</span>
      )}
    </div>
  );
}

function StatusBadge({ value }) {
  const v = String(value ?? '').toLowerCase();
  const ok = ['verified', 'active', 'approved'].includes(v);
  const pending = ['pending', 'in_review', 'review'].includes(v);
  const tone = ok
    ? 'bg-green-500/15 text-green-400'
    : pending
      ? 'bg-amber-500/15 text-amber-400'
      : 'bg-white/10 text-slate-300';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tone}`}
    >
      {value ?? '—'}
    </span>
  );
}
