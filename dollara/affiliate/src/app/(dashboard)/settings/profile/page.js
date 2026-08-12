'use client';

import { useEffect, useState } from 'react';
import { Check, Shield, Loader2 } from 'lucide-react';
import { affiliateApi } from '../../../../services/affiliateApi';
import { useAffiliate } from '../../../../context/AffiliateContext';
import { useAffiliateData } from '../../../../hooks/useAffiliateData';
import { DataState } from '../../../../components/ui/DataState';
import { toast } from '../../../../lib/toast';
import TwoFactorModal from './_components/TwoFactorModal';

/**
 * Account settings.
 *
 * Everything on this page previously mutated local state and stopped there —
 * "Save changes" only left edit mode, the password form set a message reading
 * "(mock)", and the 2FA toggle flipped a boolean with no secret behind it.
 */
export default function ProfileSettingsPage() {
  const { refresh } = useAffiliate();
  const { data, loading, error, reload } = useAffiliateData(
    '/api/v1/affiliate/profile',
    [],
  );

  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [show2faModal, setShow2faModal] = useState(false);

  // Seed the editable copy from the server once it arrives.
  useEffect(() => {
    if (data) {
      setForm({
        companyName: data.company_name || '',
        contactName: data.name || '',
        contactEmail: data.email || '',
        contactPhone: data.phone || '',
        timezone: data.timezone || 'Asia/Kolkata',
        currency: data.currency || 'INR',
        notificationPreferences: data.notification_prefs || {
          referrals: true,
          deposits: true,
          commission: true,
          payouts: true,
          keyRotation: true,
        },
      });
    }
  }, [data]);

  const profile = form ?? {
    companyName: '', contactName: '', contactEmail: '', contactPhone: '',
    timezone: '', currency: '', notificationPreferences: {},
  };

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleNotifToggle = (key) => () =>
    setForm((prev) => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [key]: !prev.notificationPreferences[key],
      },
    }));

  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await affiliateApi('/api/v1/affiliate/profile', {
        method: 'PUT',
        body: JSON.stringify({
          companyName: profile.companyName,
          contactName: profile.contactName,
          contactPhone: profile.contactPhone,
          timezone: profile.timezone,
          notificationPreferences: profile.notificationPreferences,
        }),
      });
      toast.success('Profile updated');
      setEditing(false);
      reload();
      // The sidebar and header read the name from context.
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwdMsg('');
    if (!passwords.current || !passwords.newPass) {
      setPwdMsg('Please fill in both fields.');
      return;
    }
    if (passwords.newPass !== passwords.confirm) {
      setPwdMsg('The new passwords do not match.');
      return;
    }
    if (passwords.newPass.length < 8) {
      setPwdMsg('Choose a password of at least 8 characters.');
      return;
    }

    setPwdBusy(true);
    try {
      await affiliateApi('/api/v1/affiliate/profile/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.newPass,
        }),
      });
      toast.success('Password changed');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      setPwdMsg(err.message || 'Could not change your password.');
    } finally {
      setPwdBusy(false);
    }
  };

  const handle2faChanged = () => {
    setShow2faModal(false);
    reload();
    refresh();
  };


  return (
    <div className="space-y-6 animate-fade-up">

      {/* header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">
            Profile & Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Company info, contact details, password and notification preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {editing && (
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2 text-sm font-bold text-black disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save changes
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              // Cancelling restores the server copy rather than keeping edits.
              if (editing) reload();
              setEditing((prev) => !prev);
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/70 text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>


      <DataState loading={loading && !form} error={error} onRetry={reload}>
      <div className="grid gap-4 lg:grid-cols-2">

        {/* company / contact */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
            Company & Contact
          </h2>

          <div className="mt-4 grid gap-3">
            <label className="text-xs">
              Company name
              <input
                value={profile.companyName}
                onChange={handleChange('companyName')}
                disabled={!editing}
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </label>

            <label className="text-xs">
              Contact name
              <input
                value={profile.contactName}
                onChange={handleChange('contactName')}
                disabled={!editing}
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </label>

            <label className="text-xs">
              Contact email
              {/* This is the sign-in identity. Changing it is a support action,
                  not a self-service one, so the field is always read-only. */}
              <input
                value={profile.contactEmail}
                disabled
                title="Contact support to change your sign-in email"
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-70"
              />
            </label>

            <label className="text-xs">
              Contact phone
              <input
                value={profile.contactPhone}
                onChange={handleChange('contactPhone')}
                disabled={!editing}
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </label>

            <div className="flex items-center gap-2 mt-2">
              <select
                value={profile.timezone}
                onChange={handleChange('timezone')}
                disabled={!editing}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option>UTC</option>
                <option>Europe/London</option>
                <option>America/New_York</option>
                <option>Asia/Kolkata</option>
              </select>

              {/* Currency is set by the programme, not the partner — the update
                  endpoint ignores it, so an editable control would silently
                  discard the change. */}
              <select
                value={profile.currency}
                disabled
                title="Commission is paid in the programme currency"
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-70"
              >
                <option>INR</option>
                <option>GBP</option>
              </select>
            </div>

            {editing && (
              <div className="mt-3">
                <button
                  onClick={saveProfile}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 text-black font-semibold"
                >
                  Save changes
                </button>
              </div>
            )}
          </div>
        </section>


        {/* security + notifications */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Security
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Change your password and toggle two-factor authentication.
            </p>
          </div>

          <div className="grid gap-3">
            <div>
              <label className="text-xs">
                Current password
                <input
                  type="password"
                  value={passwords.current}
                  onChange={(e) =>
                    setPasswords({ ...passwords, current: e.target.value })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </label>
            </div>

            <div>
              <label className="text-xs">
                New password
                <input
                  type="password"
                  value={passwords.newPass}
                  onChange={(e) =>
                    setPasswords({ ...passwords, newPass: e.target.value })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </label>
            </div>

            <div>
              <label className="text-xs">
                Confirm new password
                <input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirm: e.target.value })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={changePassword}
                disabled={pwdBusy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/70 text-sm font-semibold text-slate-900 dark:text-slate-100 disabled:opacity-60"
              >
                {pwdBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Change password
              </button>
              <div className="text-sm text-slate-500">{pwdMsg}</div>
            </div>


            {/* 2fa toggle */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    Two-factor authentication
                  </div>
                  <div className="text-xs text-slate-500">
                    {data?.two_factor_enabled
                      ? 'Enabled — a code is required at every sign-in'
                      : 'Disabled — your password alone protects this account'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShow2faModal(true)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100"
                >
                  {data?.two_factor_enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </div>


          {/* notification prefs */}
          <div>
            <h3 className="text-sm font-semibold">Notification preferences</h3>

            <div className="mt-2 grid gap-2">
              {Object.entries(profile.notificationPreferences).map(
                ([key, val]) => (
                  <button
                    key={key}
                    onClick={handleNotifToggle(key)}
                    aria-pressed={val}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-950/60 transition-all"
                  >
                    <div className="text-sm capitalize text-slate-900 dark:text-slate-100">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          val
                            ? 'bg-brand-500'
                            : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      >
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            val ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>

                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                          val
                            ? 'bg-brand-600 text-white'
                            : 'bg-transparent border border-slate-200 dark:border-slate-800 text-slate-400'
                        }`}
                      >
                        {val && <Check className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>
                )
              )}
            </div>
          </div>
        </section>


        {/* 2fa confirm modal */}
        {show2faModal && (
          <TwoFactorModal
            mode={data?.two_factor_enabled ? 'disable' : 'enable'}
            onClose={() => setShow2faModal(false)}
            onChanged={handle2faChanged}
          />
        )}
      </div>
      </DataState>

    </div>
  );
}