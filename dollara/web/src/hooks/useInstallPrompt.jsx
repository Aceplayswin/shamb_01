'use client';

// Owns everything the "Get the app" flow needs:
//   - registers the service worker (production only — a SW in `next dev` serves
//     stale HMR assets and makes debugging miserable),
//   - captures Chromium's `beforeinstallprompt` so a user gesture can later show
//     the native install dialog (the event only fires once and must be stashed),
//   - detects the platform + whether we're already running installed, since iOS
//     Safari has no install API and needs manual "Add to Home Screen" steps.
//
// Consumed by <GetAppModal>. Provider lives in the root layout.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const InstallContext = createContext({
  canPrompt: false,
  promptInstall: async () => 'unavailable',
  isIOS: false,
  isStandalone: false,
  platform: 'other',
});

export function useInstallPrompt() {
  return useContext(InstallContext);
}

function detectIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as a Mac; distinguish it by touch support.
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

function detectStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari exposes standalone mode here instead of via display-mode.
    window.navigator.standalone === true
  );
}

export function InstallProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(detectIOS());
    setIsStandalone(detectStandalone());

    const onBeforeInstall = (e) => {
      // Stop Chrome's mini-infobar; we drive the prompt from our own button.
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // Reflect live switches into standalone (e.g. launched from home screen).
    const mql = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayChange = (e) => setIsStandalone(e.matches);
    mql?.addEventListener?.('change', onDisplayChange);

    // Register the service worker once the page has settled.
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      mql?.removeEventListener?.('change', onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable';
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
    // The event is single-use; drop it so the button reflects reality.
    setDeferredPrompt(null);
    return choice.outcome; // 'accepted' | 'dismissed'
  }, [deferredPrompt]);

  const platform = isIOS ? 'ios' : deferredPrompt ? 'android' : 'other';

  const value = useMemo(
    () => ({ canPrompt: !!deferredPrompt, promptInstall, isIOS, isStandalone, platform }),
    [deferredPrompt, promptInstall, isIOS, isStandalone, platform]
  );

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
}
