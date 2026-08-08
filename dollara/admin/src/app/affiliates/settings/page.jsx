'use client';

import { useState } from 'react';
import { 
  AdminShell,
  Button,
  Field,
  Input,
  Select,
  toast
} from '@/components/admin/AdminShell';
import { AFFILIATE_SETTINGS } from '@/lib/affiliateMockData';
import { Percent, DollarSign, Clock, ShieldAlert } from 'lucide-react';

export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState(AFFILIATE_SETTINGS);
  const [busy, setBusy] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      toast.success('Global settings updated successfully');
      setBusy(false);
    }, 600);
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

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
              <Field label="CPA Amount ($)">
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
            <Field label="Minimum Payout Threshold ($)">
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

            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-slate-900"
                  checked={settings.fraud_block_disposable_emails}
                  onChange={e => handleChange('fraud_block_disposable_emails', e.target.checked)}
                />
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Block Disposable Emails</p>
                  <p className="text-xs text-slate-500">Prevent signups from known temporary email domains (e.g., mailinator.com)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-slate-900"
                  checked={settings.fraud_flag_self_referral}
                  onChange={e => handleChange('fraud_flag_self_referral', e.target.checked)}
                />
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">Flag Self-Referrals</p>
                  <p className="text-xs text-slate-500">Automatically flag accounts where the player device signature matches the affiliate's device signature.</p>
                </div>
              </label>
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
