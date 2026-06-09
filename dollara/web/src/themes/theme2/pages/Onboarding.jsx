'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { T2Card, t2Select, t2BtnPrimary, t2BtnGhost } from '../components/ui';

const GAME_TYPES = ['Sports Betting', 'Live Casino', 'Slots', 'Lottery', 'AI Games', 'Fantasy Games'];
const BET_RANGES = ['₹100-500', '₹500-2000', '₹2000-10000', '₹10000+'];

export default function Theme2Onboarding() {
  const router = useRouter();
  const [gameType, setGameType] = useState('');
  const [betRange, setBetRange] = useState('');
  const [step, setStep] = useState(0);

  if (step === 2) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <T2Card className="p-8">
          <h2 className="text-xl font-bold text-white">Quick Preferences</h2>
          <div className="mt-6 space-y-4">
            <label className="block text-sm text-slate-400">Preferred Game Type</label>
            <select value={gameType} onChange={(e) => setGameType(e.target.value)} className={t2Select}>
              <option value="">Select...</option>
              {GAME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="block text-sm text-slate-400">Typical Highest Bet</label>
            <select value={betRange} onChange={(e) => setBetRange(e.target.value)} className={t2Select}>
              <option value="">Select...</option>
              {BET_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="mt-8 flex gap-3">
            <button type="button" onClick={() => router.push('/')} className={`${t2BtnGhost} flex-1`}>Skip</button>
            <button type="button" onClick={() => router.push('/')} className={`${t2BtnPrimary} flex-1`}>Save &amp; Continue</button>
          </div>
        </T2Card>
      </div>
    );
  }

  const titles = ['Change Password & Enable 2FA', 'Welcome!', 'Quick Preferences'];
  const contents = [
    <p key="1" className="text-slate-400">Secure your account with a strong password and two-factor authentication.</p>,
    <div key="2" className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
      <p className="text-amber-300">₹100 FREE added to your wallet!</p>
      <p className="mt-2 text-sm text-slate-400">Explore AI Games &amp; Sports</p>
    </div>,
    null,
  ];

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <T2Card className="p-8 text-center">
        <h2 className="text-xl font-bold text-white">{titles[step]}</h2>
        <div className="mt-6">{contents[step]}</div>
        <button type="button" onClick={() => (step < 2 ? setStep(step + 1) : router.push('/'))} className={`${t2BtnPrimary} mt-8 w-full`}>
          {step < 2 ? 'Next' : 'Get Started'}
        </button>
        <button type="button" onClick={() => router.push('/')} className="mt-3 w-full text-sm text-slate-500 hover:text-white">Skip</button>
      </T2Card>
    </div>
  );
}
