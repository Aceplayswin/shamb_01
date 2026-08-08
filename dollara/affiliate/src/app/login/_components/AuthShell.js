


// Shared layout shell used by all auth screens (login, 2fa, forgot).
// Import this, wrap your form content inside, and pass a `backHref`
// and optional `backLabel` so every screen has a consistent top bar.




import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AuthShell({ children, backHref = '/', backLabel = 'Back to Home' }) {
  return (
    <div className="min-h-screen text-slate-800 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col justify-center">
      <div className="max-w-md w-full mx-auto relative z-10">




        {/* Top bar: back link + logo */}

        <div className="mb-8 flex items-center justify-between">
          <Link
            href={backHref}
            className=
            "inline-flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{backLabel}</span>


          </Link>

          <div className="flex items-center space-x-2">
            <img src="/logo/image.png" alt="Dollara Logo" className="h-8 w-auto object-contain" />
            <span className="font-bold text-slate-900 font-display">DOLLARA</span>
          </div>
        </div>




        {/* Frosted glass card */}

        <div className="glass p-8 sm:p-10 bg-white/80 border-slate-200 shadow-xl rounded-3xl relative">
          {children}
        </div>

      </div>
    </div>
  );
}

// Shared style tokens
// Import these in each auth page so every input/label looks identical.



export const inputClasses =
  'w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-colors shadow-sm';


export const labelClasses =
  'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2';


export const primaryBtn =
  'w-full py-3.5 text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-500 rounded-xl shadow-md hover:scale-[1.01] transition-all flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100';


export function Spinner() {
  return <span className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />;
}
