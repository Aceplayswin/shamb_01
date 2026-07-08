'use client';

// Theme3 Onboarding — same steps as theme2, cream style.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { T3Card, t3Select, t3BtnPrimary, t3BtnOutline } from '../components/ui';

const GAME_TYPES = ['Sports Betting', 'Live Casino', 'Slots', 'Lottery', 'AI Games', 'Fantasy Games'];
const BET_RANGES = ['₹100-500', '₹500-2000', '₹2000-10000', '₹10000+'];

export default function Theme3Onboarding() {
  const router = useRouter();
  const [gameType, setGameType] = useState('');
  const [betRange, setBetRange] = useState('');
  const [step, setStep] = useState(0);

  if (step === 2) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <T3Card className="p-8">
          <h2 className="text-xl font-black text-[#1b1726]">Quick Preferences</h2>
          <div className="mt-6 space-y-4">
            <label className="block text-sm text-[#6b6579]">Preferred Game Type</label>
            <select value={gameType} onChange={(e) => setGameType(e.target.value)} className={t3Select}>
              <option value="">Select...</option>
              {GAME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="block text-sm text-[#6b6579]">Typical Highest Bet</label>
            <select value={betRange} onChange={(e) => setBetRange(e.target.value)} className={t3Select}>
              <option value="">Select...</option>
              {BET_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="mt-8 flex gap-3">
            <button type="button" onClick={() => router.push('/')} className={`${t3BtnOutline} flex-1`}>Skip</button>
            <button type="button" onClick={() => router.push('/')} className={`${t3BtnPrimary} flex-1`}>Save &amp; Continue</button>
          </div>
        </T3Card>
      </div>
    );
  }

  const titles = ['Change Password & Enable 2FA', 'Welcome!', 'Quick Preferences'];
  const contents = [
    <p key="1" className="text-[#6b6579]">Secure your account with a strong password and two-factor authentication.</p>,
    <div key="2" className="rounded-xl border border-[#c79a3b]/25 bg-[#faf6ec] p-4">
      <p className="font-black text-[#9a7a24]">₹100 FREE added to your wallet!</p>
      <p className="mt-2 text-sm text-[#6b6579]">Explore AI Games &amp; Sports</p>
    </div>,
    null,
  ];

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <T3Card className="p-8 text-center">
        <h2 className="text-xl font-black text-[#1b1726]">{titles[step]}</h2>
        <div className="mt-6">{contents[step]}</div>
        <button type="button" onClick={() => (step < 2 ? setStep(step + 1) : router.push('/'))} className={`${t3BtnPrimary} mt-8 w-full`}>
          {step < 2 ? 'Next' : 'Get Started'}
        </button>
        <button type="button" onClick={() => router.push('/')} className="mt-3 w-full text-sm text-[#9a94a8] hover:text-[#1b1726]">Skip</button>
      </T3Card>
    </div>
  );
}
