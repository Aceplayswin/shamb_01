

// Step 4 — Tracking Link
// Displays the auto-generated referral link with a copy-to-clipboard button.
// Also shows a summary of what the partner configured in previous steps.
// `copied` state is local — no need to lift it to page.js.



'use client';



import { useState } from 'react';
import { ArrowLeft, Link2, Check, Copy, CheckSquare } from 'lucide-react';
import { primaryBtn, ghostBtn, Spinner } from './tokens';



// In Phase 2 this value comes from the JWT / session cookie.






export default function StepTrackingLink({ affiliate, payoutMethod, docFile, onBack, onFinish, loading }) {
  // The partner's real code and tracking URL, from the session. The comment on
  // the constant this replaces said it would come from the session in phase 2 —
  // this is that.
  const refCode = affiliate?.code ?? '—';
  const trackingLink = affiliate
    ? `${affiliate.tracking_base_url}${affiliate.code}`
    : '';
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(trackingLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };



  return (
    <div className="animate-fade-up space-y-6">



      {/* Hero */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 flex items-center justify-center mx-auto mb-4">
          <Link2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 font-display">
          Your Tracking Link is Ready!
        </h2>
        <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
          Share this link across your channels. Every signup attributed to it will appear in your dashboard.
        </p>
      </div>



      {/* Referral code badge */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-brand-500/10 border border-brand-400/20">
        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
          Your Referral Code
        </span>
        <span className="text-sm font-black text-brand-700 font-display tracking-widest">
          {refCode}
        </span>
      </div>



      {/* Copy link */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Default Partner Link
        </label>


        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={trackingLink}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm font-mono shadow-sm cursor-default"
          />



          <button
            type="button"
            onClick={copyLink}
            className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all flex items-center space-x-1.5 ${
              copied
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-brand-400 hover:text-brand-700'
            }`}
          >



            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>


        </div>

        <p className="text-[10px] text-slate-400 mt-1.5">
          Create additional links with custom campaign IDs from the{' '}
          <strong>Links & Creatives</strong> section of your dashboard.
        </p>

      </div>

      {/* Onboarding summary */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-600">

        <p className="font-bold text-slate-800 mb-1">Onboarding Summary</p>

        <div className="flex justify-between">
          <span>T&Cs Accepted</span>
          <span className="text-emerald-600 font-semibold">✓ Yes</span>
        </div>


        <div className="flex justify-between">
          <span>Payout Method</span>
          <span className="text-slate-900 font-semibold">{payoutMethod}</span>
        </div>


        <div className="flex justify-between">

          <span>KYC Document</span>

          <span className="text-slate-900 font-semibold">

            {docFile ? docFile.name : 'Skipped'}

          </span>

        </div>

      </div>

      {/* Navigation */}

      <div className="flex gap-3">

        <button type="button" onClick={onBack} className={`${ghostBtn} max-w-[120px]`}>

          <ArrowLeft className="w-4 h-4" />

          <span>Back</span>

        </button>

        <button
          type="button"
          onClick={onFinish}
          disabled={loading}
          className={primaryBtn}
        >

          {loading ? (
            <Spinner />
          ) : (
            <>
              <CheckSquare className="w-4 h-4" />
              <span>Enter Dashboard</span>
            </>
          )}
          
        </button>
      </div>


    </div>


  );
}
