'use client';

import { useState } from 'react';
import { X, Copy, Check, Sparkles } from 'lucide-react';




export default function InviteSubModal({ onClose }) {
  const [overrideRate, setOverrideRate] = useState('5%');
  const [copied, setCopied] = useState(false);




  const inviteLink = `https://dollara.com/apply?parent_affiliate_id=DLR-AF7X92&override_rate=${overrideRate.replace('%', '')}`;



  const handleCopy = () => {
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
                {inviteLink}
              </p>
            </div>
          </div>



          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
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
