'use client';

import { useMemo, useState } from 'react';
import { Download, Code, Image } from 'lucide-react';
import { useAffiliate } from '../../../../context/AffiliateContext';
import { useAffiliateData } from '../../../../hooks/useAffiliateData';
import { DataState } from '../../../../components/ui/DataState';
import { toast } from '../../../../lib/toast';

export default function CreativeGalleryTab() {
  const [sizeFilter, setSizeFilter] = useState('All');
  const [copiedId, setCopiedId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const { me } = useAffiliate();
  const { data, loading, error, reload } = useAffiliateData(
    '/api/v1/affiliate/creatives?limit=100',
    [],
  );
  const creatives = data?.records ?? [];

  // Filters are derived from what is actually in the library rather than a
  // fixed list that goes stale the moment marketing adds a new size.
  const sizeFilters = useMemo(() => {
    const labels = [...new Set(creatives.map((c) => c.size_label).filter(Boolean))];
    return ['All', ...labels];
  }, [creatives]);

  const filtered = sizeFilter === 'All'
    ? creatives
    : creatives.filter((c) => c.size_label === sizeFilter);

  const trackingUrl = me ? `${me.tracking_base_url}${me.code}` : '';

  const copyEmbed = (creative) => {
    const [width, height] = (creative.dimensions || 'x').split('x');
    const code = `<a href="${trackingUrl}" target="_blank" rel="noopener">`
      + `<img src="${creative.file_url}"${width ? ` width="${width}"` : ''}`
      + `${height ? ` height="${height}"` : ''} alt="${creative.title}" /></a>`;
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(creative.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  /**
   * Download the real asset.
   *
   * This button had no onClick at all before — it looked live and did nothing.
   * Fetching to a blob rather than linking directly keeps the filename tidy and
   * works for assets served without a Content-Disposition header.
   */
  const downloadAsset = async (creative) => {
    setDownloadingId(creative.id);
    try {
      const res = await fetch(creative.file_url);
      if (!res.ok) throw new Error('Asset unavailable');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const ext = (creative.file_url.split('.').pop() || 'png').split('?')[0];
      anchor.download = `${creative.title.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || 'Could not download that creative');
    } finally {
      setDownloadingId(null);
    }
  };




  return (
    <div className="space-y-4">

      {/* Size filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {sizeFilters.map((f) => (

          <button
            key={f}
            onClick={() => setSizeFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              sizeFilter === f
                ? 'bg-brand-500/15 text-brand-700 dark:text-brand-400 border border-brand-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {f}
          </button>


        ))}
      </div>




      {/* Gallery grid */}

      <DataState
        loading={loading}
        error={error}
        onRetry={reload}
        empty={!creatives.length}
        emptyTitle="No creatives available yet"
        emptyHint="Marketing publishes banners here for partners to use. Check back soon."
        emptyIcon={Image}
      >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

        {filtered.map((creative) => (

          <div
            key={creative.id}
            className="glass rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none overflow-hidden group hover:scale-[1.01] transition-all duration-300"
          >

            {/* Banner preview — the real asset, not a coloured placeholder */}
            <div className="relative flex min-h-[140px] items-center justify-center bg-slate-100 p-3 dark:bg-slate-800">

              <img
                src={creative.thumbnail_url || creative.file_url}
                alt={creative.title}
                loading="lazy"
                className="max-h-[130px] w-full object-contain"
              />

              {/* Size badge */}
              {creative.dimensions && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/40 text-white text-[9px] font-bold backdrop-blur-sm">
                  {creative.dimensions}
                </span>
              )}

            </div>



            {/* Card details */}
            <div className="p-3 space-y-2">

              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{creative.title}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {creative.size_label}{creative.dimensions ? ` — ${creative.dimensions} px` : ''}
                </p>
              </div>

              <div className="flex gap-1.5">

                <button
                  type="button"
                  onClick={() => downloadAsset(creative)}
                  disabled={downloadingId === creative.id}
                  className="flex-1 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  {downloadingId === creative.id ? 'Saving…' : 'Download'}
                </button>


                <button
                  onClick={() => copyEmbed(creative)}
                  className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${
                    copiedId === creative.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Code className="w-3 h-3" /> {copiedId === creative.id ? 'Copied!' : 'HTML'}
                </button>


              </div>

            </div>


          </div>
        )
        
        )
        
        }


      </div>
      </DataState>

    </div>
  );
}
