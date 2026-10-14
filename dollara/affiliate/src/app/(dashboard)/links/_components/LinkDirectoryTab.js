'use client';

import { useState } from 'react';
import { Archive, Copy, Check, Link2, QrCode, Search } from 'lucide-react';
import { affiliateApi } from '../../../../services/affiliateApi';
import { DataState } from '../../../../components/ui/DataState';
import { confirmDialog, toast } from '../../../../lib/toast';
import { inr, num } from '../../../../lib/format';

export default function LinkDirectoryTab({ links, loading, error, onReload, onShowQr }) {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const needle = search.trim().toLowerCase();
  const filtered = links.filter(
    (l) =>
      l.name.toLowerCase().includes(needle)
      || (l.sub_id || '').toLowerCase().includes(needle)
      || l.code.toLowerCase().includes(needle),
  );

  const handleCopy = (link) => {
    // The tracking URL the server minted, so it always points at the real
    // redirect endpoint rather than a hand-built player-site URL.
    navigator.clipboard.writeText(link.tracking_url).then(() => {
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleArchive = async (link) => {
    const ok = await confirmDialog({
      title: `Archive "${link.name}"?`,
      text: 'The link stops accepting new clicks. Referrals it already brought in '
        + 'keep earning, and its history stays on your reports.',
      confirmText: 'Archive link',
      danger: true,
    });
    if (!ok) return;

    setBusyId(link.id);
    try {
      await affiliateApi(`/api/v1/affiliate/links/${link.id}`, { method: 'DELETE' });
      toast.success('Link archived');
      onReload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };


  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
        />
      </div>



      {/* Table */}
      <DataState
        loading={loading}
        error={error}
        onRetry={onReload}
        empty={!links.length}
        emptyTitle="No tracking links yet"
        emptyHint="Create your first link and share it to start attributing traffic."
        emptyIcon={Link2}
      >
      
      <div className="glass rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none overflow-hidden transition-colors duration-300">
        
        <div className="overflow-x-auto">
         
          <table className="w-full text-left border-collapse text-xs">
           
            <thead>
             
             
              <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/40 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Campaign</th>
                <th className="p-4">Target</th>
                <th className="p-4">Clicks</th>
                <th className="p-4">Signups</th>
                <th className="p-4">FTDs</th>
                <th className="p-4">Conv.</th>
                <th className="p-4">Commission</th>
                <th className="p-4 text-right">Actions</th>
              </tr>


            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
             
              {filtered.map((link) => {
                const convRate = link.clicks > 0 ? ((link.ftds / link.clicks) * 100).toFixed(1) : '0.0';
              
                return (
                 
                 <tr key={link.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    
                    <td className="p-4">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">{link.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5">
                        {link.sub_id ? `sub=${link.sub_id}` : link.code}
                        {!link.is_active && (
                          <span className="ml-1.5 rounded bg-slate-200 px-1.5 py-0.5 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                            archived
                          </span>
                        )}
                      </span>
                    </td>
                   
                    <td className="p-4">
                    
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold">{link.target_path}</span>
                   
                    </td>
                   
                   
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{num(link.clicks)}</td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{num(link.signups)}</td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{num(link.ftds)}</td>
                   
                    <td className="p-4">
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-100 dark:border-emerald-900/30">{convRate}%</span>
                    </td>
                    <td className="p-4 font-bold text-brand-600 dark:text-brand-400 font-display">{inr(link.commission)}</td>
                   
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                       
                       
                        <button
                          onClick={() => handleCopy(link)}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                            copiedId === link.id
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                          title="Copy link"
                        >
                          {copiedId === link.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>


                        <button
                          onClick={() => onShowQr(link)}
                          className="w-7 h-7 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-all"
                          title="QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {link.is_active && (
                          <button
                            onClick={() => handleArchive(link)}
                            disabled={busyId === link.id}
                            className="w-7 h-7 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-danger-300 hover:text-danger-500 flex items-center justify-center transition-all disabled:opacity-50"
                            title="Archive link"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}


                      </div>
                  
                    </td>
                  </tr>
             
            
            );
              
              })
              }
             
             
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">No links match your search.</td></tr>
              )}
           
           
            </tbody>
         
         
         
          </table>
       
       
        </div>
     
      </div>
      </DataState>
   
    </div>


);
}
