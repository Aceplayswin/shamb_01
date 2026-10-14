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
        <p className="mt-1 text-sm text-slate-400">
          Configure default rules, tracking, and payout limits for the entire affiliate program.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* Commission Defaults */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="mb-1 flex items-center gap-2">
            <Percent className="text-emerald-500" size={20} />
            <h3 className="text-lg font-semibold text-white">Commission Defaults</h3>
          </div>
          <p className="mb-5 text-sm text-slate-400">
            Applied to newly approved affiliates unless overridden per account.
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Default Commission Type">
              <Select
                value={settings.default_commission_type}
                onChange={(e) => handleChange('default_commission_type', e.target.value)}
              >
                <option value="revenue_share">Revenue Share</option>
                <option value="cpa">CPA (Cost Per Action)</option>
                <option value="hybrid">Hybrid</option>
              </Select>
            </Field>

            <Field label="Rev Share (%)">
              <Input
                type="number"
                value={settings.default_commission_rate}
                onChange={(e) => handleChange('default_commission_rate', Number(e.target.value))}
              />
            </Field>

            <Field label="CPA Amount (₹)">
              <Input
                type="number"
                value={settings.default_cpa_amount}
                onChange={(e) => handleChange('default_cpa_amount', Number(e.target.value))}
              />
            </Field>

            <Field
              label="Minimum Deposit (₹)"
              hint="A player must deposit at least this much before commission is processed."
            >
              <Input
                type="number"
                min="0"
                value={settings.default_min_deposit ?? 4000}
                onChange={(e) => handleChange('default_min_deposit', Number(e.target.value))}
              />
            </Field>

            <Field
              label="Minimum Redeposits"
              hint="That amount must arrive across at least this many deposits."
            >
              <Input
                type="number"
                min="0"
                step="1"
                value={settings.default_min_redeposits ?? 5}
                onChange={(e) => handleChange('default_min_redeposits', Number(e.target.value))}
              />
            </Field>

            <Field
              label="Qualification Period (Days)"
              hint="Both conditions must be met within this many days of signup."
            >
              <Input
                type="number"
                min="0"
                step="1"
                value={settings.default_qualification_period_days ?? 15}
                onChange={(e) => handleChange('default_qualification_period_days', Number(e.target.value))}
              />
            </Field>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Revenue share and CPA for a referred player start only after the minimum deposit
            is reached in at least the minimum number of deposits, inside the qualification
            period. An affiliate left at 0 inherits these.
          </p>
        </section>

        {/* Attribution & Tracking + Payout — side by side on large screens */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <Clock className="text-emerald-500" size={20} />
              <h3 className="text-lg font-semibold text-white">Attribution & Tracking</h3>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="Cookie Window (Days)"
                hint="How long after a click a signup can still be credited to that affiliate."
              >
                <Input
                  type="number"
                  value={settings.cookie_window_days}
                  onChange={(e) => handleChange('cookie_window_days', Number(e.target.value))}
                />
              </Field>

              <Field
                label="Click Retention (Days)"
                hint="Unconverted clicks are purged after this. Converted clicks are kept as attribution evidence."
              >
                <Input
                  type="number"
                  min="30"
                  value={settings.click_retention_days}
                  onChange={(e) => handleChange('click_retention_days', Number(e.target.value))}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <DollarSign className="text-emerald-500" size={20} />
              <h3 className="text-lg font-semibold text-white">Payout Rules</h3>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="Min Payout Threshold (₹)"
                hint="Minimum approved balance before a withdrawal can be requested. Per-affiliate terms can override this."
              >
                <Input
                  type="number"
                  value={settings.min_payout_threshold}
                  onChange={(e) => handleChange('min_payout_threshold', Number(e.target.value))}
                />
              </Field>

              <Field label="Allowed Payout Cycle">
                <Select
                  value={settings.payout_cycle}
                  onChange={(e) => handleChange('payout_cycle', e.target.value)}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="on_demand">On-Demand (Anytime)</option>
                </Select>
              </Field>

              <Field
                label="Auto-approve After (Days)"
                hint="Pending entries older than this auto-approve unless a fraud flag is open. Set 0 to approve by hand."
              >
                <Input
                  type="number"
                  min="0"
                  value={settings.auto_approve_days}
                  onChange={(e) => handleChange('auto_approve_days', Number(e.target.value))}
                />
              </Field>

              <Field
                label="Min First Deposit for CPA (₹)"
                hint="A first deposit below this does not trigger the acquisition bounty."
              >
                <Input
                  type="number"
                  min="0"
                  value={settings.cpa_min_deposit}
                  onChange={(e) => handleChange('cpa_min_deposit', Number(e.target.value))}
                />
              </Field>
            </div>
          </section>
        </div>

        {/* Network Overrides */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Percent className="text-emerald-500" size={20} />
            <h3 className="text-lg font-semibold text-white">Network Overrides</h3>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Field
              label="Default Override Rate (%)"
              hint="Share of a sub-affiliate's rev-share and CPA earnings paid up to their parent. Taken from the sub's cut, never compounded up the chain."
            >
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={settings.default_override_rate}
                onChange={(e) => handleChange('default_override_rate', Number(e.target.value))}
              />
            </Field>

            <Field
              label="Maximum Network Depth"
              hint="How many levels up the tree an override is paid."
            >
              <Input
                type="number"
                min="1"
                max="10"
                value={settings.max_override_depth}
                onChange={(e) => handleChange('max_override_depth', Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </section>

        {/* Fraud Controls */}
        <section className="rounded-xl border border-slate-800 border-l-4 border-l-amber-500 bg-slate-900 p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <ShieldAlert className="text-amber-500" size={20} />
            <h3 className="text-lg font-semibold text-white">Fraud & Security Controls</h3>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Field
              label="Max Referrals Per IP"
              hint="Flags the affiliate if too many signups come from the same IP."
            >
              <Input
                type="number"
                value={settings.fraud_max_referrals_per_ip}
                onChange={(e) => handleChange('fraud_max_referrals_per_ip', Number(e.target.value))}
              />
            </Field>

            <div className="flex flex-col justify-center gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-4 lg:col-span-2">
              <div>
                <Toggle
                  checked={Boolean(settings.fraud_block_disposable_emails)}
                  onChange={(v) => handleChange('fraud_block_disposable_emails', v)}
                  label="Flag disposable email domains"
                />
                <p className="mt-1 pl-[2.875rem] text-xs text-slate-500">
                  Raises a flag on throwaway addresses. Signups are never blocked.
                </p>
              </div>

              <div>
                <Toggle
                  checked={Boolean(settings.fraud_flag_self_referral)}
                  onChange={(v) => handleChange('fraud_flag_self_referral', v)}
                  label="Flag self-referrals"
                />
                <p className="mt-1 pl-[2.875rem] text-xs text-slate-500">
                  Flags a referral whose contact details match the affiliate&apos;s own.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="sticky bottom-0 z-10 -mx-1 flex justify-end border-t border-slate-800/80 bg-slate-950/90 px-1 py-4 backdrop-blur">
          <Button type="submit" variant="primary" size="lg" busy={busy}>
            Update Settings
          </Button>
        </div>

      </form>
    </AdminShell>
  );
}
