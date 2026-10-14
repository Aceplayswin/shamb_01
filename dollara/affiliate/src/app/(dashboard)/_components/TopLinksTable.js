

// src/app/(dashboard)/_components/TopLinksTable.js


'use client';

import React, { useState } from 'react';
import NextLink from 'next/link';
import { Copy, Check, Link } from 'lucide-react';
import { useAffiliateData } from '../../../hooks/useAffiliateData';
import { DataState } from '../../../components/ui/DataState';
import { inr, num } from '../../../lib/format';




export default function TopLinksTable() {
  const [copiedId, setCopiedId] = useState(null);

  // Five best links by commission. The server already returns per-link stats,
  // so the ranking happens where the numbers live.
  const { data, loading, error, reload } = useAffiliateData(
    '/api/v1/affiliate/links?limit=5',
    [],
  );
  const links = data?.records ?? [];

  const handleCopy = (link) => {
    // The real tracking URL the server built, not a hand-assembled string with
    // a hardcoded partner code and hostname.
    navigator.clipboard.writeText(link.tracking_url).then(() => {
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };




  return (
    <div className="glass rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none overflow-hidden flex flex-col h-full transition-colors duration-300">
     
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
       
        <div>
         
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Link className="w-4 h-4 text-brand-600" />
          
            <span>
              Top Performing Links
              </span>


          </h3>


          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">


            Primary links driving referral traffic this period


            </p>


        </div>

      </div>


      <DataState
        loading={loading}
        error={error}
        onRetry={reload}
        empty={!links.length}
        emptyTitle="No tracking links yet"
        emptyHint="Create your first link to start attributing traffic."
        emptyIcon={Link}
      >
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/40 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Campaign Name</th>
                <th className="p-4">Clicks</th>
                <th className="p-4">Signups</th>
                <th className="p-4">FTDs</th>
                <th className="p-4">Commission</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">{link.name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5">
                      {link.sub_id ? `sub=${link.sub_id}` : link.code}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{num(link.clicks)}</td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{num(link.signups)}</td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{num(link.ftds)}</td>
                  <td className="p-4 font-bold text-brand-600 font-display">{inr(link.commission)}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(link)}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                          copiedId === link.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                        title="Copy tracking link"
                      >
                        {copiedId === link.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 p-3 text-center dark:border-slate-800">
          <NextLink
            href="/links"
            className="text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
          >
            View all links →
          </NextLink>
        </div>
      </DataState>

    </div>




  );
}
