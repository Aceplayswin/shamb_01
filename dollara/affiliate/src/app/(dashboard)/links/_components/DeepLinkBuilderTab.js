'use client';

import { useState } from 'react';
import { Smartphone, Copy, Check, Apple, Monitor } from 'lucide-react';




export default function DeepLinkBuilderTab() {
  const [platform, setPlatform] = useState('android');
  const [bundleId, setBundleId] = useState('com.dollara.gaming');
  const [deepPath, setDeepPath] = useState('dollara://slots/crash-game');
  const [sub, setSub] = useState('');
  const [copied, setCopied] = useState(false);

  const generatedUrl = `https://dollara.com/dl?platform=${platform}&pkg=${bundleId}&deep=${encodeURIComponent(deepPath)}&ref=DLR-AF7X92${sub ? `&sub=${sub}` : ''}`;

  const handleCopy = () => {



    navigator.clipboard.writeText(generatedUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);


    
    }
  );

  };

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors';
  const labelCls = 'block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5';



  return (

    <div className="max-w-2xl space-y-6">


      <div className="glass rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none p-6 transition-colors duration-300">
       
        <div className="flex items-center gap-2 mb-5">
          <Smartphone className="w-5 h-5 text-brand-600" />
          
          <h3 className="text-base font-black font-display text-slate-900 dark:text-slate-100">

            Deep-Link Builder

            </h3>

        </div>



        <div className="space-y-4">
          {/* Platform select */}
          <div>
            <label className={labelCls}>Platform</label>
            <div className="flex gap-2">
              <button
                onClick={() => setPlatform('android')}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  platform === 'android'
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <Monitor className="w-4 h-4" /> Android (Play Store)
              </button>
              <button
                onClick={() => setPlatform('ios')}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  platform === 'ios'
                    ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-400'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <Apple className="w-4 h-4" />
                 iOS (App Store)
              </button>
            </div>
          </div>


          {/* Bundle ID */}
          <div>
            <label className={labelCls}>

              App Package / Bundle ID
              
              </label>
            <input type="text" value={bundleId} onChange={(e) => setBundleId(e.target.value)} placeholder="com.dollara.gaming" className={inputCls} />
          </div>



          {/* Deep link target */}
          <div>
            <label className={labelCls}>Target Deep Link URL</label>
            <input type="text" value={deepPath} onChange={(e) => setDeepPath(e.target.value)} placeholder="dollara://slots/crash-game" className={inputCls} />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              The in-app screen the user should land on after install.
              </p>
          </div>



          {/* Sub-ID */}
          <div>
            <label className={labelCls}>Sub-ID (Optional)</label>
            <input type="text" value={sub} onChange={(e) => setSub(e.target.value)} placeholder="e.g. crash-promo" className={inputCls} />
          </div>





        </div>


      </div>




      {/* Generated URL output */}

      <div className="glass rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/80 shadow-sm dark:shadow-none p-5 transition-colors duration-300">

        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Generated Attribution Link
          </p>



        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <p className="text-xs font-mono text-brand-600 dark:text-brand-400 break-all leading-relaxed">{generatedUrl}</p>
        </div>


        <button
          onClick={handleCopy}
          className={`mt-3 w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            copied
              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30'
              : 'bg-gradient-to-r from-brand-400 to-brand-600 text-black shadow-sm hover:shadow-md hover:brightness-105'
          }`}
        >
          {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
        </button>



        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 text-center">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-400 font-bold">Phase 1 Mock</span> — Real deferred deep-linking in Phase 2
       
       
        </p>
   
                    </div>
   
    </div>
 
);
}
