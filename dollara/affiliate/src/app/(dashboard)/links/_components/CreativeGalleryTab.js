'use client';

import { useState } from 'react';
import { mockCreatives } from '../../../../lib/mockData';
import { Download, Code, Image } from 'lucide-react';




const SIZE_FILTERS = ['All', 'Leaderboard', 'Medium Rectangle', 'Skyscraper', 'Social'];

export default function CreativeGalleryTab() {

  const [sizeFilter, setSizeFilter] = useState('All');
  const [copiedId, setCopiedId] = useState(null);


  const filtered = sizeFilter === 'All'
    ? mockCreatives
    : mockCreatives.filter((c) => c.label === sizeFilter);


  const copyEmbed = (creative) => {
    const code = `<a href="https://dollara.com/?ref=DLR-AF7X92&sub=${creative.id}"><img src="https://cdn.dollara.com/creatives/${creative.id}.png" width="${creative.size.split('x')[0]}" height="${creative.size.split('x')[1]}" alt="${creative.name}" /></a>`;
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(creative.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };




  return (
    <div className="space-y-4">

      {/* Size filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {SIZE_FILTERS.map((f) => (

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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

        {filtered.map((creative) => (

          <div
            key={creative.id}
            className="glass rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none overflow-hidden group hover:scale-[1.01] transition-all duration-300"
          >

            {/* Banner preview */}
            <div className={`relative bg-gradient-to-br ${creative.color} p-4 flex flex-col items-center justify-center min-h-[140px]`}>

              <img src="/logo/image.png" alt="Dollara" className="h-6 w-auto object-contain mb-2 opacity-90" />

              <span className="text-white text-xs font-black font-display tracking-tight uppercase">
                {creative.name}
              </span>

              <span className="mt-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-bold backdrop-blur-sm">
                Play Now →
              </span>

              {/* Size badge */}
              <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/30 text-white text-[9px] font-bold backdrop-blur-sm">
                {creative.size}
              </span>

            </div>



            {/* Card details */}
            <div className="p-3 space-y-2">

              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{creative.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{creative.label} — {creative.size} px</p>
              </div>

              <div className="flex gap-1.5">

                <button
                  className="flex-1 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
                >
                  <Download className="w-3 h-3" /> PNG


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



    </div>



  );
}
