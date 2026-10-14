'use client';

// Theme4 Onboarding — same steps as theme2/3, teal style.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { T4Card, t4Select, t4BtnPrimary, t4BtnOutline } from '../components/ui';

const GAME_TYPES = ['Sports Betting', 'Live Casino', 'Slots', 'Lottery', 'AI Games', 'Fantasy Games'];
const BET_RANGES = ['₹100-500', '₹500-2000', '₹2000-10000', '₹10000+'];

export default function Theme4Onboarding() {
  const router = useRouter();
  const [gameType, setGameType] = useState('');
  const [betRange, setBetRange] = useState('');
  const [step, setStep] = useState(0);

  if (step === 2) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <T4Card className="p-8">
          <h2 className="text-xl font-black text-[#13272b]">Quick Preferences</h2>
          <div className="mt-6 space-y-4">
            <label className="block text-sm text-[#5d7378]">Preferred Game Type</label>
            <select value={gameType} onChange={(e) => setGameType(e.target.value)} className={t4Select}>
              <option value="">Select...</option>
              {GAME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="block text-sm text-[#5d7378]">Typical Highest Bet</label>
            <select value={betRange} onChange={(e) => setBetRange(e.target.value)} className={t4Select}>
              <option value="">Select...</option>
              {BET_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="mt-8 flex gap-3">
            <button type="button" onClick={() => router.push('/')} className={`${t4BtnOutline} flex-1`}>Skip</button>
            <button type="button" onClick={() => router.push('/')} className={`${t4BtnPrimary} flex-1`}>Save &amp; Continue</button>
          </div>
        </T4Card>
      </div>
    );
  }

  const titles = ['Change Password & Enable 2FA', 'Welcome!', 'Quick Preferences'];
  const contents = [
    <p key="1" className="text-[#5d7378]">Secure your account with a strong password and two-factor authentication.</p>,
    <div key="2" className="rounded border border-[#0e7480]/25 bg-[#eef6f7] p-4">
      <p className="font-black text-[#0e7480]">₹100 FREE added to your wallet!</p>
      <p className="mt-2 text-sm text-[#5d7378]">Explore AI Games &amp; Sports</p>
    </div>,
    null,
  ];

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <T4Card className="p-8 text-center">
        <h2 className="text-xl font-black text-[#13272b]">{titles[step]}</h2>
        <div className="mt-6">{contents[step]}</div>
        <button type="button" onClick={() => (step < 2 ? setStep(step + 1) : router.push('/'))} className={`${t4BtnPrimary} mt-8 w-full`}>
          {step < 2 ? 'Next' : 'Get Started'}
        </button>
        <button type="button" onClick={() => router.push('/')} className="mt-3 w-full text-sm text-[#8aa0a4] hover:text-[#13272b]">Skip</button>
      </T4Card>
    </div>
  );
}
