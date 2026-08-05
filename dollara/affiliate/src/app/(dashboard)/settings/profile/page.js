'use client';

import { useState } from 'react';
import { mockAffiliateProfile } from '../../../../lib/mockData';
import { Check, Shield, Globe } from 'lucide-react';


export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState(mockAffiliateProfile);
  const [editing, setEditing] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });
  const [pwdMsg, setPwdMsg] = useState('');
  const [show2faModal, setShow2faModal] = useState(false);
  const [twoFaAction, setTwoFaAction] = useState(null);
  const [twoFaMsg, setTwoFaMsg] = useState('');


  // simple helpers for inputs
  const handleChange = (field) => (e) =>
    setProfile({ ...profile, [field]: e.target.value });

  const handleToggle = (key) => () =>
    setProfile({ ...profile, [key]: !profile[key] });

  const handleNotifToggle = (key) => () =>
    setProfile({
      ...profile,
      notificationPreferences: {
        ...profile.notificationPreferences,
        [key]: !profile.notificationPreferences[key],
      },
    });


  const saveProfile = () => {
    // just leave edit mode for now (mock)
    setEditing(false);
  };

  const changePassword = () => {
    if (!passwords.current || !passwords.newPass) {
      setPwdMsg('Please fill both fields');
      return;
    }

    if (passwords.newPass !== passwords.confirm) {
      setPwdMsg('New passwords do not match');
      return;
    }

    setPwdMsg('Password changed (mock)');
    setPasswords({ current: '', newPass: '', confirm: '' });
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

        <button
          onClick={() => setEditing((s) => !s)}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/70 text-sm font-semibold text-slate-900 dark:text-slate-100"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>


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
              <input
                value={profile.contactEmail}
                onChange={handleChange('contactEmail')}
                disabled={!editing}
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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

              <select
                value={profile.currency}
                onChange={handleChange('currency')}
                disabled={!editing}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option>USD</option>
                <option>EUR</option>
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
                onClick={changePassword}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/70 text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
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
                    {profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTwoFaAction(
                      profile.twoFactorEnabled ? 'disable' : 'enable'
                    );
                    setShow2faModal(true);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100"
                >
                  {profile.twoFactorEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>

            {twoFaMsg && (
              <div className="text-xs text-sky-500 mt-2">{twoFaMsg}</div>
            )}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShow2faModal(false)}
            />

            <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Confirm {twoFaAction === 'disable' ? 'disable' : 'enable'}{' '}
                two-factor
              </h3>

              <p className="text-xs text-slate-500 mt-2">
                Are you sure you want to{' '}
                {twoFaAction === 'disable' ? 'disable' : 'enable'} two-factor
                authentication for your account?
              </p>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShow2faModal(false)}
                  className="px-3 py-2 rounded-xl border text-sm"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    const newVal = twoFaAction === 'enable';
                    setProfile({ ...profile, twoFactorEnabled: newVal });
                    setTwoFaMsg(
                      `Two-factor ${newVal ? 'enabled' : 'disabled'}`
                    );
                    setShow2faModal(false);
                    setTimeout(() => setTwoFaMsg(''), 3000);
                  }}
                  className="px-3 py-2 rounded-xl bg-brand-600 text-white text-sm"
                >
                  {twoFaAction === 'disable' ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}