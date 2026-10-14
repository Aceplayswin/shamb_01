'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';

const EMPTY_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function PasswordField({ id, label, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-app-fg">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
          className="w-full rounded-lg border border-hairline/15 bg-panel-strong px-4 py-3 pr-12 text-app-fg outline-none transition placeholder:text-muted focus:border-brand-500/60"
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-muted transition hover:text-app-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (isHydrated && !token) router.replace('/login');
  }, [isHydrated, router, token]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setStatus(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (form.newPassword.length < 6) {
      setStatus({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setStatus({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      await api('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      setForm(EMPTY_FORM);
      setStatus({ type: 'success', text: 'Your password has been changed.' });
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (!isHydrated || !token) return null;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 items-start px-4 py-8 sm:py-12">
      <section className="card-glass w-full p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-app-fg">Change Password</h1>
            <p className="mt-1 text-sm text-muted">Choose a new password for your account.</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-5">
          <PasswordField
            id="current-password"
            label="Current password"
            value={form.currentPassword}
            onChange={update('currentPassword')}
            autoComplete="current-password"
          />
          <PasswordField
            id="new-password"
            label="New password"
            value={form.newPassword}
            onChange={update('newPassword')}
            autoComplete="new-password"
          />
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            autoComplete="new-password"
          />

          {status && (
            <p className={`text-sm ${status.type === 'success' ? 'text-green-400' : 'text-red-400'}`} role="status">
              {status.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !form.currentPassword || !form.newPassword || !form.confirmPassword}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 font-semibold text-surface-900 shadow-lg shadow-brand-500/20 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4" />
            {saving ? 'Changing password…' : 'Change Password'}
          </button>
        </form>
      </section>
    </main>
  );
}
