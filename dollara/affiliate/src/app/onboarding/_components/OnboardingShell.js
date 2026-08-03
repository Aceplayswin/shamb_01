// Shared page wrapper: top bar, glass card, step indicator, and progress bar.
// Used only by onboarding/page.js — one import wraps all four steps.

import Link from 'next/link';
import { ArrowLeft, FileText, CreditCard, ShieldCheck, Link2, Check } from 'lucide-react';

const STEPS = [
  { number: 1, label: 'Terms & Conditions', icon: FileText },
  { number: 2, label: 'Payout Method',      icon: CreditCard },
  { number: 3, label: 'KYC / Identity',     icon: ShieldCheck },
  { number: 4, label: 'Tracking Link',      icon: Link2 },
];

export default function OnboardingShell({ currentStep, children }) {
  return (
    <div className="min-h-screen text-slate-800 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-2xl w-full mx-auto relative z-10">

        {/* Top bar */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
          <div className="flex items-center space-x-2">
            <img src="/logo/image.png" alt="Dollara Logo" className="h-8 w-auto object-contain" />
            <span className="font-bold text-slate-900 font-display">DOLLARA</span>
          </div>
        </div>

        {/* Glass card */}
        <div className="glass p-8 sm:p-10 bg-white/80 border-slate-200 shadow-xl rounded-3xl">

          {/* Title + step dots */}
          <div className="mb-10">
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900">
                Partner Onboarding
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Complete all four steps to activate your account
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto text-center text-[10px] font-semibold">
              {STEPS.map(({ number, label, icon: Icon }) => {
                const active  = currentStep >= number;
                const current = currentStep === number;
                return (
                  <div key={number} className="flex flex-col items-center space-y-1.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                        current
                          ? 'bg-brand-500 border-brand-500 text-black shadow-md shadow-brand-500/30'
                          : active
                          ? 'bg-brand-500/20 border-brand-400 text-brand-700'
                          : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}
                    >
                      {active && !current ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span className={active ? 'text-slate-800' : 'text-slate-400'}>{label}</span>
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden max-w-lg mx-auto">
              <div
                className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Step content injected here */}
          {children}
        </div>

      </div>
    </div>
  );
}
