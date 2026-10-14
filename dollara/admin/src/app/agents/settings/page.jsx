'use client';

import { useEffect, useState } from 'react';
import {
  AdminShell,
  Button,
  ErrorState,
  Field,
  Input,
  Select,
  toast,
  useAdminData,
} from '@/components/admin/AdminShell';
import { adminApi } from '@/services/adminApi';
import { Percent, Wallet, Clock, Network, Loader2 } from 'lucide-react';

/**
 * Programme-wide defaults for the agent hierarchy.
 *
 * Stored as one JSON row in `platform_settings`, which is why this whole screen
 * is a single GET and a single PUT. Everything here is what an approval starts
 * from — nothing is retroactive, and an account's own terms always win once it
 * exists.
 */
export default function AgentGlobalSettingsPage() {
  const { data, loading, error, reload } = useAdminData(
    '/api/v1/admin/agents/settings',
    [],
  );
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi('/api/v1/admin/agents/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      toast.success('Agent programme settings updated');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (error) {
    return (
      <AdminShell title="Agent Settings">
        <ErrorState message={error} onRetry={reload} />
      </AdminShell>
    );
  }

  if (!settings) {
    return (
      <AdminShell title="Agent Settings">
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Agent Settings">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Global Settings</h2>
        <p className="text-slate-400">
          Defaults the agent programme opens accounts on, and the terms its
          public landing page quotes.
        </p>
      </div>

      <form onSubmit={handleSave} className="max-w-4xl space-y-6">

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center gap-2">
            <Network className="text-emerald-500" size={20} />
            <h3 className="text-lg font-semibold text-white">New Account Defaults</h3>
          </div>
          <p className="mb-6 text-sm text-slate-400">
            What an approval form opens on. Every one of these can be overridden
            per account at the moment of approval.
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Field label="Default level">
                <Select
                  value={settings.default_level}
                  onChange={(e) => handleChange('default_level', e.target.value)}
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="super_master">Super Master</option>
                  <option value="master">Master</option>
                  <option value="agent">Agent</option>
                </Select>
              </Field>
              <p className="mt-2 text-xs text-slate-500">
                An account may only ever sit strictly below its upline, so a
                default too high in the tree simply cannot be used by most
                approvers.
              </p>
            </div>

            <Field label="Default opening credit (₹)">
              <Input
                type="number"
                min="0"
                value={settings.default_opening_credit}
                onChange={(e) => handleChange('default_opening_credit', Number(e.target.value))}
              />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center gap-2">
            <Percent className="text-emerald-500" size={20} />
            <h3 className="text-lg font-semibold text-white">Commercial Terms</h3>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Field label="Default partnership (%)">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={settings.default_partnership}
                  onChange={(e) => handleChange('default_partnership', Number(e.target.value))}
                />
              </Field>
              <p className="mt-2 text-xs text-slate-500">
                An agent&apos;s share of the P&amp;L their downline generates.
              </p>
            </div>

            <Field label="Default commission (%)">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={settings.default_commission_rate}
                onChange={(e) => handleChange('default_commission_rate', Number(e.target.value))}
              />
            </Field>

            <Field label="Minimum partnership (%)">
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.min_partnership}
                onChange={(e) => handleChange('min_partnership', Number(e.target.value))}
              />
            </Field>

            <Field label="Maximum partnership (%)">
              <Input
                type="number"
                min="0"
                max="100"
                value={settings.max_partnership}
                onChange={(e) => handleChange('max_partnership', Number(e.target.value))}
              />
            </Field>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center gap-2">
            <Clock className="text-emerald-500" size={20} />
            <h3 className="text-lg font-semibold text-white">Applications</h3>
          </div>

          <div className="max-w-md">
            <Field label="Quoted review time (hours)">
              <Input
                type="number"
                min="1"
                value={settings.review_hours}
                onChange={(e) => handleChange('review_hours', Number(e.target.value))}
              />
            </Field>
            <p className="mt-2 text-xs text-slate-500">
              Shown on the public agent landing page and to an applicant checking
              their status. Nothing enforces it — it is a promise, so keep it one
              the review queue can actually keep.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center gap-2">
            <Wallet className="text-emerald-500" size={20} />
            <h3 className="text-lg font-semibold text-white">Currency</h3>
          </div>

          <div className="max-w-md">
            <Field label="Programme currency">
              <Input
                value={settings.currency}
                onChange={(e) => handleChange('currency', e.target.value.toUpperCase())}
              />
            </Field>
            <p className="mt-2 text-xs text-slate-500">
              Stamped onto new accounts. Existing accounts keep whatever they were
              opened with.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" variant="primary" size="lg" busy={busy}>
            Update Settings
          </Button>
        </div>
      </form>
    </AdminShell>
  );
}
