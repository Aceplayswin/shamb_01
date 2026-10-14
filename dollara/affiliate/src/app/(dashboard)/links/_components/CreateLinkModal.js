'use client';

import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { affiliateApi } from '../../../../services/affiliateApi';
import { useAffiliate } from '../../../../context/AffiliateContext';
import { useAffiliateData } from '../../../../hooks/useAffiliateData';




export default function CreateLinkModal({ onClose, onCreated }) {


  const [name, setName] = useState('');
  const [sub, setSub] = useState('');
  const [target, setTarget] = useState('/');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { me } = useAffiliate();
  // Landing pages come from the API so the dropdown cannot drift from the
  // routes the player site actually serves.
  const { data: pagesData } = useAffiliateData('/api/v1/affiliate/landing-pages', []);
  const landingPages = pagesData?.records ?? [{ value: '/', label: 'Homepage' }];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setError('Give this link a campaign name.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = await affiliateApi('/api/v1/affiliate/links/create', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          subId: sub.trim().toLowerCase().replace(/\s+/g, '-') || undefined,
          targetPath: target,
        }),
      });
      onCreated(created);
    } catch (err) {
      setError(err.message || 'Could not create the link.');
      setSaving(false);
    }
  };




  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors';
  const labelCls = 'block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5';




  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />


      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black font-display text-slate-900 dark:text-slate-100">Create Tracking Link</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>


        </div>



        <form onSubmit={handleSubmit} className="space-y-4">


          <div>
            <label className={labelCls}>Campaign Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Homepage Banner Q4" className={inputCls} required />
          </div>



          <div>
            <label className={labelCls}>Sub-ID / Campaign Tag *</label>
            <input type="text" value={sub} onChange={(e) => setSub(e.target.value)} placeholder="e.g. q4-banner" className={inputCls} required />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Alphanumeric, used in the tracking URL as <code className="text-brand-600">sub=</code> parameter.</p>
          </div>

          

          <div>
            <label className={labelCls}>Target Landing Page</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)} className={inputCls}>
              {landingPages.map((p) => (
                <option key={p.value} value={p.value}>{p.label} — {p.value}</option>
              ))}
            </select>
          </div>


          {/* Preview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Link Preview</p>
            <p className="text-xs font-mono text-brand-600 dark:text-brand-400 break-all">
              {me?.web_url ?? ''}{target}?ref={me?.code ?? '…'}
              {sub ? `&sub=${sub.trim().toLowerCase().replace(/\s+/g, '-')}` : ''}
            </p>
          </div>




          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-danger-400/40 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            /* sub-id is optional — the server defaults it, and requiring it here
               blocked the common case of one plain link per campaign. */
            disabled={saving || !name.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 text-black font-bold text-sm shadow-sm hover:shadow-md hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Creating...</>
            ) : 'Create Link'}
          </button>

          
        </form>



      </div>
    </div>
  );



}
