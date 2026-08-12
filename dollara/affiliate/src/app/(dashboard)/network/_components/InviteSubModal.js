'use client';

import { useEffect, useState } from 'react';
import { X, Copy, Check, Sparkles, Loader2 } from 'lucide-react';
import { affiliateApi } from '../../../../services/affiliateApi';
import { toast } from '../../../../lib/toast';

export default function InviteSubModal({ onClose }) {
  const [overrideRate, setOverrideRate] = useState('5%');
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * The link is minted by the server, not assembled here.
   *
   * That matters for two reasons: the rate is capped against the programme
   * default (a partner cannot invite someone at a rate the platform has not
   * sanctioned), and the resulting URL carries the parameters the apply form
   * actually reads. The previous hand-built link used a parameter name nothing
   * consumed, so every invite produced an unlinked application.
   */
  useEffect(() => {
    let active = true;
    setLoading(true);
    affiliateApi('/api/v1/affiliate/network/invite', {
      method: 'POST',
      body: JSON.stringify({ overrideRate: overrideRate.replace('%', '') }),
    })
      .then((res) => {
        if (!active) return;
        setInviteLink(res.invite_url);
        // The server may have clamped the rate; show what it actually granted.
        setOverrideRate(`${res.override_rate}%`);
      })
      .catch((err) => active && toast.error(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideRate]);

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const overrideRates = ['2%', '3%', '5%', '7%', '10%'];





  const labelCls = 'block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600" />
            Invite Sub-Affiliate
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>





        <div className="space-y-5">
          {/* Info note */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Recruit sub-affiliates to your network and earn an **override commission** on all traffic they refer.
            </p>
          </div>




          {/* Rate preset selector */}
          <div>
            <label className={labelCls}>
              Override Commission Tier
              </label>
            <div className="flex gap-1.5 flex-wrap">
              {overrideRates.map((rate) => (
                <button
                  key={rate}
                  onClick={() => setOverrideRate(rate)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    overrideRate === rate
                      ? 'bg-brand-500/15 border-brand-500/30 text-brand-700 dark:text-brand-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {rate}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
              The percentage of their commission base that will be credited as override earnings to your ledger.
            </p>
          </div>




          {/* Link output */}
          <div>
            <label className={labelCls}>Invite Link</label>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <p className="text-xs font-mono text-brand-600 dark:text-brand-400 break-all leading-normal">
                {loading ? (
                  <span className="inline-flex items-center gap-2 text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating link…
                  </span>
                ) : (
                  inviteLink || 'Could not generate a link. Close and try again.'
                )}
              </p>
            </div>
          </div>



          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={loading || !inviteLink}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
              copied
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30'
                : 'bg-gradient-to-r from-brand-400 to-brand-600 text-black shadow-sm hover:shadow-md hover:brightness-105'
            }`}
          >
            {copied ? (
              <><Check className="w-4 h-4" /> 

              Copied Invite Link!

              </>
            ) 
            
            : (
              <><Copy className="w-4 h-4" />
              
               Copy Invite Link</>

            )}
          </button>



        </div>
      </div>
    </div>
  );
}
