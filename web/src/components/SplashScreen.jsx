'use client';

import { useEffect, useState } from 'react';

export function SplashScreen({ onComplete }) {
  const [visible, setVisible] = useState(true);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    const skipTimer = setTimeout(() => setCanSkip(true), 2000);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 3500);
    return () => {
      clearTimeout(skipTimer);
      clearTimeout(hideTimer);
    };
  }, [onComplete]);

  if (!visible) return null;

  const skip = () => {
    setVisible(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-surface-950">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-mesh-amber blur-3xl" />
      <div className="relative animate-fade-up text-center">
        <h1 className="font-display text-6xl font-black tracking-tight md:text-8xl">
          <span className="shimmer-text">DOLLARA</span>
        </h1>
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.4em] text-accent-300/70">Play · Win · Repeat</p>
        <div className="mx-auto mt-8 h-1 w-40 overflow-hidden rounded-full bg-surface-700">
          <div className="h-full w-1/2 animate-marquee bg-gradient-to-r from-brand-400 to-accent-400" />
        </div>
      </div>
      {canSkip && (
        <button
          type="button"
          onClick={skip}
          className="absolute bottom-12 rounded-full border border-white/15 px-6 py-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          Skip
        </button>
      )}
    </div>
  );
}
