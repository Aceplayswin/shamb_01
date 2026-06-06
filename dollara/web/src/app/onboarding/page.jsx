'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';

const GAME_TYPES = [
  'Sports Betting',
  'Live Casino',
  'Slots',
  'Lottery',
  'AI Games',
  'Fantasy Games',
];

const BET_RANGES = ['₹100-500', '₹500-2000', '₹2000-10000', '₹10000+'];

export default function OnboardingPage() {
  const router = useRouter();
  const [gameType, setGameType] = useState('');
  const [betRange, setBetRange] = useState('');
  const [step, setStep] = useState(0);

  if (step === 2) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-lg flex-1 px-4 py-12">
          <div className="card-glass p-8">
            <h2 className="text-xl font-bold">Quick Preferences</h2>
            <div className="mt-6 space-y-4">
              <label className="block text-sm text-slate-400">Preferred Game Type</label>
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white"
              >
                <option value="">Select...</option>
                {GAME_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <label className="block text-sm text-slate-400">Typical Highest Bet</label>
              <select
                value={betRange}
                onChange={(e) => setBetRange(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-surface-700 px-4 py-3 text-white"
              >
                <option value="">Select...</option>
                {BET_RANGES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 rounded-lg border border-white/20 py-3 text-slate-400"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 rounded-lg bg-brand-500 py-3 font-semibold text-surface-900"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  const titles = ['Change Password & Enable 2FA', 'Welcome!', 'Quick Preferences'];
  const contents = [
    <p key="1" className="text-slate-400">
      Secure your account with a strong password and two-factor authentication.
    </p>,
    <div key="2" className="rounded-lg bg-brand-500/20 p-4">
      <p className="text-brand-300">₹100 FREE added to your wallet!</p>
      <p className="mt-2 text-sm text-slate-400">Explore AI Games & Sports</p>
    </div>,
    null,
  ];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-lg flex-1 px-4 py-12">
        <div className="card-glass p-8 text-center">
          <h2 className="text-xl font-bold">{titles[step]}</h2>
          <div className="mt-6">{contents[step]}</div>
          <button
            type="button"
            onClick={() => (step < 2 ? setStep(step + 1) : router.push('/'))}
            className="mt-8 w-full rounded-lg bg-brand-500 py-3 font-semibold text-surface-900"
          >
            {step < 2 ? 'Next' : 'Get Started'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-3 w-full text-sm text-slate-500 hover:text-white"
          >
            Skip
          </button>
        </div>
      </main>
    </>
  );
}
