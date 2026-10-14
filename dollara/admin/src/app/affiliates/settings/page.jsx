'use client';

import { useEffect, useState } from 'react';
import {
  AdminShell,
  Button,
  ErrorState,
  Field,
  Input,
  Select,
  Toggle,
  toast,
  useAdminData,
} from '@/components/admin/AdminShell';
import { adminApi } from '@/services/adminApi';
import { Percent, DollarSign, Clock, ShieldAlert, Loader2 } from 'lucide-react';

/**
 * Programme-wide defaults.
 *
 * Stored as one JSON row in `platform_settings`, which is why this whole screen
 * is a single GET and a single PUT. Every rate here is what an affiliate
 * inherits when their own override is left at zero.
 */
export default function GlobalSettingsPage() {
  const { data, loading, error, reload } = useAdminData(
    '/api/v1/admin/affiliates/settings',
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
      await adminApi('/api/v1/admin/affiliates/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      toast.success('Global settings updated');
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
      <AdminShell title="Global Settings">
        <ErrorState message={error} onRetry={reload} />
      </AdminShell>
    );
  }

  if (!settings) {
    return (
      <AdminShell title="Global Settings">
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Global Settings">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Global Settings</h2>
        <p className="text-slate-400">Configure default rules, tracking, and payout limits for the entire affiliate program.</p>
      </div>

      <form onSubmit={handleSave} className="max-w-4xl space-y-6">
        
        {/* Commission Defaults */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Percent className="text-emerald-500" size={20} />
            <h3 className="text-lg font-semibold text-white">Commission Defaults</h3>
          </div>
          <p className="text-sm text-slate-400 mb-6">These rates will be automatically applied to any newly approved affiliate unless overridden.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Default Commission Type">
              <Select 
                value={settings.default_commission_type}
                onChange={e => handleChange('default_commission_type', e.target.value)}
              >
                <option value="revenue_share">Revenue Share</option>
                <option value="cpa">CPA (Cost Per Action)</option>
                <option value="hybrid">Hybrid</option>
              </Select>
            </Field>
            
            <div className="grid grid-cols-2 gap-4">
              <Field label="Rev Share (%)">
                <Input 
                  type="number" 
                  value={settings.default_commission_rate}
                  onChange={e => handleChange('default_commission_rate', Number(e.target.value))}
                />
              </Field>
              <Field label="CPA Amount (₹)">
                <Input 
                  type="number" 
                  value={settings.default_cpa_amount}
                  onChange={e => handleChange('default_cpa_amount', Number(e.target.value))}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Attribution & Tracking */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="text-emerald-500" size={20} />
            <h3 className="text-lg font-semibold text-white">Attribution & Tracking</h3>
          </div>
          <div className="max-w-md">
            <Field label="Cookie Window (Days)">
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  value={settings.cookie_window_days}
                  onChange={e => handleChange('cookie_window_days', Number(e.target.value))}
                />
                <span className="text-slate-400 text-sm whitespace-nowrap">days</span>
              </div>
            </Field>
            <p className="text-xs text-slate-500 mt-2">How long after clicking an affiliate link a user can sign up and still be credited to that affiliate.</p>
          </div>
        </div>

        {/* Payout Rules */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="text-emerald-500" size={20} />
            <h3 className="text-lg font-semibold text-white">Payout Rules</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Minimum Payout Threshold (₹)">
              <Input 
                type="number" 
                value={settings.min_payout_threshold}
                onChange={e => handleChange('min_payout_threshold', Number(e.target.value))}
              />
            </Field>
            
            <Field label="Allowed Payout Cycle">
              <Select 
                value={settings.payout_cycle}
                onChange={e => handleChange('payout_cycle', e.target.value)}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="on_demand">On-Demand (Anytime)</option>
              </Select>
            </Field>

            <div>
              <Field label="Auto-approve commission after (days)">
                <Input
                  type="number"
                  min="0"
                  value={settings.auto_approve_days}
                  onChange={(e) => handleChange('auto_approve_days', Number(e.target.value))}
                />
              </Field>
              <p className="mt-2 text-xs text-slate-500">
                Pending entries older than this are approved automatically — unless the
                referral carries an open fraud flag, which always waits for a human.
                Set 0 to approve everything by hand.
              </p>
            </div>

            <div>
              <Field label="Minimum first deposit for CPA (₹)">
                <Input
                  type="number"
                  min="0"
                  value={settings.cpa_min_deposit}
                  onChange={(e) => handleChange('cpa_min_deposit', Number(e.target.value))}
                />
              </Field>
              <p className="mt-2 text-xs text-slate-500">
                A first deposit below this does not trigger the acquisition bounty.
              </p>
            </div>
          </div>
        </div>

        {/* Network overrides */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center gap-2">
            <Percent className="text-emerald-500" size={20} />
            <h3 className="text-lg font-semibold text-white">Network Overrides</h3>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Field label="Default override rate (%)">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={settings.default_override_rate}
                  onChange={(e) => handleChange('default_override_rate', Number(e.target.value))}
                />
              </Field>
              <p className="mt-2 text-xs text-slate-500">
                What a parent earns on their sub-affiliates&apos; commission. Overrides
                are never taken on other overrides, so a deep chain cannot compound.
              </p>
            </div>

            <div>
              <Field label="Maximum network depth">
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.max_override_depth}
                  onChange={(e) => handleChange('max_override_depth', Number(e.target.value))}
                />
              </Field>
              <p className="mt-2 text-xs text-slate-500">
                How many levels up the tree an override is paid.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <Toggle
              checked={Boolean(settings.deduct_bonus_from_ngr)}
              onChange={(v) => handleChange('deduct_bonus_from_ngr', v)}
              label="Deduct bonus costs from net gaming revenue"
            />
            <Toggle
              checked={Boolean(settings.negative_ngr_carry_forward)}
              onChange={(v) => handleChange('negative_ngr_carry_forward', v)}
              label="Carry a losing day forward against future revenue"
            />
          </div>
        </div>

        {/* Fraud Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 mb-6">
            <ShieldAlert className="text-amber-500" size={20} />
            <h3 className="text-lg font-semibold text-white">Fraud & Security Controls</h3>
          </div>
          
          <div className="space-y-6">
            <div className="max-w-md">
              <Field label="Max Referrals Per IP (Velocity Limit)">
                <Input 
                  type="number" 
                  value={settings.fraud_max_referrals_per_ip}
                  onChange={e => handleChange('fraud_max_referrals_per_ip', Number(e.target.value))}
                />
              </Field>
              <p className="text-xs text-slate-500 mt-2">Flags the affiliate account if too many signups occur from the exact same IP address.</p>
            </div>

            {/* The shared Toggle, not raw checkboxes — these looked and behaved
                differently from every other switch in the console. */}
            <div className="flex flex-col gap-4">
              <div>
                <Toggle
                  checked={Boolean(settings.fraud_block_disposable_emails)}
                  onChange={(v) => handleChange('fraud_block_disposable_emails', v)}
                  label="Flag disposable email domains"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Raises a flag when a referred player signs up with a throwaway address.
                  Signups are never blocked — a false positive would cost a real player.
                </p>
              </div>

              <div>
                <Toggle
                  checked={Boolean(settings.fraud_flag_self_referral)}
                  onChange={(v) => handleChange('fraud_flag_self_referral', v)}
                  label="Flag self-referrals"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Flags a referral whose contact details match the affiliate&apos;s own.
                </p>
              </div>

              <div>
                <Field label="Click retention (days)">
                  <Input
                    type="number"
                    min="30"
                    value={settings.click_retention_days}
                    onChange={(e) => handleChange('click_retention_days', Number(e.target.value))}
                  />
                </Field>
                <p className="mt-1 text-xs text-slate-500">
                  Unconverted click records are purged after this. Converted clicks are
                  kept regardless — they are the evidence behind an attribution.
                </p>
              </div>
            </div>
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
