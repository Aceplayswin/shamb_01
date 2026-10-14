


// Shared style tokens + Spinner used by every onboarding step.


// Change a class here → it updates across all steps automatically.



export const inputClasses =
  'w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm transition-colors shadow-sm';


  
export const labelClasses =
  'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2';




export const primaryBtn =
  'flex-1 py-3.5 text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-500 rounded-xl shadow-md hover:scale-[1.01] transition-all flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed';



export const ghostBtn =
  'flex-1 py-3.5 text-sm font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2';



export function Spinner() {
  
  return (
    <span className="w-5 h-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
  );


}
