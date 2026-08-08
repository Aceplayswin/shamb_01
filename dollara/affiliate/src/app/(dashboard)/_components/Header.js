'use client';




import { useState } from 'react';
import { Bell, Calendar, Sun, Moon } from 'lucide-react';



const PRESETS = [
  { label: 'Today',      days: 0 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days',days: 30 },
  { label: 'This Month',  days: null },
];



function todayISO() {


  return new Date().toISOString().split('T')[0];


}


function offsetISO(days) {


  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];


}

export default function Header({ theme, toggleTheme }) {


  const [activePreset, setActivePreset] = useState('Last 7 Days');

  const [from, setFrom] = useState(offsetISO(7));

  const [to,   setTo]   = useState(todayISO());


  const applyPreset = ({ label, days }) => {

    setActivePreset(label);

    if (days === 0) { setFrom(todayISO()); setTo(todayISO()); return; }

    if (days === null) {

      const d = new Date();

      setFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);

      setTo(todayISO());

      return;

    }


    setFrom(offsetISO(days));


    setTo(todayISO());




  };

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
              onClick={() => applyPreset(p)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                activePreset === p.label
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
            value={from}
            onChange={(e) => { setFrom(e.target.value); setActivePreset('Custom'); }}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px] focus:outline-none focus:border-brand-500"
          />

          <span className="dark:text-slate-500">→</span>


          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setActivePreset('Custom'); }}
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




        {/* Notification bell */}
        <button
          type="button"
          className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500 border border-white dark:border-slate-900" />
        </button>



        {/* User avatar */}
        <div className="flex items-center space-x-2">
         
         
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-black font-bold text-xs shrink-0 shadow-sm">
            A
          </div>


          <div className="hidden sm:block">

            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Alex Morgan</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Partner Account</p>
            
          </div>
        </div>



      </div>
    </header>
  );
}
