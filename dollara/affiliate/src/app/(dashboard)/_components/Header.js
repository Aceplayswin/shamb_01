'use client';




import Link from 'next/link';
import { Bell, Calendar, Sun, Moon } from 'lucide-react';
import { useAffiliate } from '../../../context/AffiliateContext';



// Mirrors the keys AffiliateProvider understands. The range itself lives in
// context, not here: while this component owned it, changing the date range
// re-rendered the picker and reached no page below it.
const PRESETS = [
  { label: 'Last 7 Days', key: '7d' },
  { label: 'Last 30 Days', key: '30d' },
  { label: 'Last 90 Days', key: '90d' },
];



export default function Header({ theme, toggleTheme }) {
  const { me, unread, range, applyPreset, setCustomRange } = useAffiliate();

  const initial = (me?.name || '?').trim().charAt(0).toUpperCase();

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm sticky top-0 z-30 transition-colors duration-300">




      {/* Left: Date range picker */}

      <div className="flex items-center space-x-3">

        <Calendar className="w-4 h-4 text-slate-400" />



        {/* Preset quick buttons */}

        <div className="hidden sm:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          {PRESETS.map((p) => (
          
          <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                range.preset === p.key
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >


              {p.label}


            </button>


          ))}

        </div>


        {/* Manual date inputs */}

        <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-500">
         
          <input
            type="date"
            value={range.from}
            onChange={(e) => setCustomRange(e.target.value, range.to)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px] focus:outline-none focus:border-brand-500"
          />

          <span className="dark:text-slate-500">→</span>


          <input
            type="date"
            value={range.to}
            onChange={(e) => setCustomRange(range.from, e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px] focus:outline-none focus:border-brand-500"
          />
        </div>



      </div>




      {/* Right: Theme Toggle + Notifications + Avatar */}

      <div className="flex items-center space-x-3">

        {/* Theme Toggle Button */}

        <button
          type="button"
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >

          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500 animate-pulse" /> : <Moon className="w-4 h-4" />}
        </button>




        {/* Notification bell — a link now, and the dot reflects the real count */}
        <Link
          href="/notifications"
          title={unread ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'Notifications'}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-brand-500 px-1 text-[9px] font-bold text-slate-900 dark:border-slate-900">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>



        {/* User avatar */}
        <div className="flex items-center space-x-2">
         
         
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-black font-bold text-xs shrink-0 shadow-sm">
            {initial}
          </div>


          <div className="hidden sm:block">

            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {me?.name ?? 'Loading…'}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {me?.tier_label ? `${me.tier_label} Partner` : 'Partner Account'}
            </p>

          </div>
        </div>



      </div>
    </header>
  );
}
