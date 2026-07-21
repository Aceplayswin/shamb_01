'use client';

// The "Get the app" popup. One button, three realities:
//   - Chromium (Android / desktop Chrome-Edge): we captured beforeinstallprompt,
//     so a single tap opens the OS install dialog.
//   - iOS Safari: no install API exists — show the Share -> Add to Home Screen
//     steps, the only way to install a PWA on iPhone/iPad.
//   - Anything else (already installed, Firefox, desktop Safari, in-app
//     browsers): show a short generic "use your browser menu" hint.
//
// Works signed-in or not; branded from useBranding. Opened by the header button.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, Plus, Share, Smartphone, Sparkles, X } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

const PERKS = [
  'Full-screen play — no browser bars',
  'Launches from your home screen in one tap',
  'Faster loads and smoother live tables',
  'Works offline-friendly with instant startup',
];

export function GetAppModal({ open, onClose }) {
  const branding = useBranding();
  const { canPrompt, promptInstall, isIOS, isStandalone } = useInstallPrompt();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setMounted(true), []);

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const name = branding.product_name || 'the app';

  const handleInstall = async () => {
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);
    if (outcome === 'accepted') onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Get the ${name} app`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-hairline/10 bg-panel-strong shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* accent glow */}
        <div
          className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full opacity-30 blur-3xl"
          style={{ background: `radial-gradient(circle, ${branding.theme_color}, transparent 70%)` }}
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-hairline/10 bg-panel/70 text-muted transition hover:text-app-fg"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-7">
          {/* brand mark */}
          <div className="flex items-center gap-3">
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logo_url} alt={name} className="h-12 w-12 rounded-xl object-contain" />
            ) : (
              <span
                className="grid h-12 w-12 place-items-center rounded-xl shadow-glow"
                style={{ background: `linear-gradient(135deg, ${branding.theme_color}, ${branding.secondary_color})` }}
              >
                <Sparkles className="h-5 w-5 text-surface-950" strokeWidth={2.5} />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-extrabold text-app-fg">
                Get the {name} app
              </h2>
              <p className="text-xs text-muted">Install it free — no app store needed.</p>
            </div>
          </div>

          {/* action area */}
          <div className="mt-5">
            {isStandalone ? (
              <div className="rounded-xl border border-hairline/10 bg-panel/50 p-4 text-center">
                <Check className="mx-auto mb-1 h-6 w-6 text-emerald-400" />
                <p className="text-sm font-semibold text-app-fg">You're already using the app</p>
                <p className="mt-0.5 text-xs text-muted">Launch it any time from your home screen.</p>
              </div>
            ) : canPrompt ? (
              <button
                type="button"
                onClick={handleInstall}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 px-6 py-3.5 text-sm font-bold text-surface-950 shadow-glow transition hover:brightness-110 disabled:opacity-60"
              >
                <Download className="h-5 w-5" />
                {busy ? 'Installing…' : 'Install app'}
              </button>
            ) : isIOS ? (
              <IOSSteps />
            ) : (
              <GenericSteps />
            )}
          </div>

          {/* perks */}
          {!isStandalone && (
            <ul className="mt-5 grid gap-2">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-xs text-app-fg/80">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
                  {perk}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function StepRow({ n, children }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-400/15 text-xs font-bold text-brand-300">
        {n}
      </span>
      <span className="flex flex-wrap items-center gap-1.5 text-sm text-app-fg/90">{children}</span>
    </li>
  );
}

function Pill({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-hairline/10 bg-panel/60 px-1.5 py-0.5 text-xs font-semibold text-app-fg">
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

function IOSSteps() {
  return (
    <div className="rounded-xl border border-hairline/10 bg-panel/50 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Smartphone className="h-3.5 w-3.5" /> Install on iPhone or iPad (Safari)
      </p>
      <ol className="space-y-2.5">
        <StepRow n={1}>
          Tap the <Pill icon={Share} label="Share" /> button in Safari's toolbar.
        </StepRow>
        <StepRow n={2}>
          Choose <Pill icon={Plus} label="Add to Home Screen" />.
        </StepRow>
        <StepRow n={3}>Tap “Add” — the icon appears on your home screen.</StepRow>
      </ol>
    </div>
  );
}

function GenericSteps() {
  return (
    <div className="rounded-xl border border-hairline/10 bg-panel/50 p-4">
      <p className="mb-2 text-xs font-semibold text-muted">Install from your browser</p>
      <p className="text-sm text-app-fg/90">
        Open your browser menu and choose{' '}
        <span className="font-semibold text-app-fg">“Install app”</span> or{' '}
        <span className="font-semibold text-app-fg">“Add to Home Screen”</span>. On desktop
        Chrome or Edge, look for the install icon at the end of the address bar.
      </p>
    </div>
  );
}
