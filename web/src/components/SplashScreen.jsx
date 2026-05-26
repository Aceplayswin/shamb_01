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
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface-900 animate-in fade-in">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gradient md:text-8xl">DOLLARA</h1>
        <p className="mt-4 text-lg text-slate-400">Play Smart. Win Big.</p>
      </div>
      {canSkip && (
        <button
          type="button"
          onClick={skip}
          className="absolute bottom-12 rounded-full border border-white/20 px-6 py-2 text-sm text-slate-400 hover:bg-white/10"
        >
          Skip
        </button>
      )}
    </div>
  );
}
