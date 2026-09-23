'use client';

// Theme4 "Get the App" — EXCHANGE teal style. Same install surface as the
// header's <GetAppModal/> (captured beforeinstallprompt via useInstallPrompt,
// which is already provided at the root layout) but as a full page with the
// Android APK section the product admin can publish from /admin/app
// (/api/v1/app/download → /api/v1/app/apk, a stable redirect so replacing the
// build never breaks a printed QR code or shared link).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Download, Plus, Share, Smartphone } from 'lucide-react';
import { API_URL } from '@/services/tenant';
import { api } from '@/services/api';
import { useBranding } from '@/hooks/useBranding';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { T4Card, t4BtnPrimary, T4FormPage } from '../components/ui';

const PERKS = [
  'Full-screen play — no browser bars',
  'Launches from your home screen in one tap',
  'Faster loads and smoother live tables',
  'Instant alerts for deposits, withdrawals and bet results',
];

export default function Theme4AppDownload() {
  const branding = useBranding();
  const { canPrompt, promptInstall, isIOS, isStandalone } = useInstallPrompt();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api('/api/v1/app/download')
      .then((data) => active && setConfig(data))
      .catch(() => active && setConfig(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const name = branding.product_name || 'DOLLARA';
  const apkAvailable = config?.available;
  const downloadUrl = `${API_URL}/api/v1/app/apk`;

  const handleInstall = async () => {
    setBusy(true);
    await promptInstall();
    setBusy(false);
  };

  return (
    <T4FormPage title="Get the App" maxWidth="max-w-2xl">
      <T4Card className="mt-6 p-6 sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#eef6f7] px-3 py-1 text-[0.7rem] font-black uppercase tracking-wide text-[#0e7480]">
          <Smartphone className="h-3.5 w-3.5" /> Mobile app
        </span>

        <h2 className="mt-4 font-display text-2xl font-black text-[#13272b] sm:text-3xl">
          Install {name}
        </h2>
        <p className="mt-2 text-sm text-[#5d7378]">
          Add it to your home screen for the fastest way to play, deposit and track your
          bets. It installs free — no app store needed.
        </p>

        {/* ── Primary install action ── */}
        <div className="mt-6">
          {isStandalone ? (
            <div className="rounded border border-black/[0.06] bg-[#f7fafa] p-5 text-center">
              <Check className="mx-auto mb-1 h-6 w-6 text-[#1c8a52]" />
              <p className="text-sm font-black text-[#13272b]">You&apos;re already using the app</p>
              <p className="mt-0.5 text-sm text-[#5d7378]">
                Launch it any time from your home screen.
              </p>
            </div>
          ) : canPrompt ? (
            <button
              type="button"
              onClick={handleInstall}
              disabled={busy}
              className={`${t4BtnPrimary} inline-flex items-center gap-2`}
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

        {/* ── Perks ── */}
        {!isStandalone && (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-2 text-sm text-[#13272b]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1c8a52]" />
                {perk}
              </li>
            ))}
          </ul>
        )}
      </T4Card>

      {/* ── Android APK, only once the admin publishes one ── */}
      {loading ? (
        <div className="mt-4 h-24 animate-pulse rounded bg-black/[0.04]" />
      ) : apkAvailable ? (
        <T4Card className="mt-4 p-6">
          <h3 className="font-display text-sm font-black uppercase tracking-wide text-[#13272b]">
            Android APK
          </h3>
          <p className="mt-1 text-sm text-[#5d7378]">
            Prefer the native Android build? Download it directly.
          </p>

          <a
            href={downloadUrl}
            className="mt-4 inline-flex items-center gap-2 rounded bg-gradient-to-b from-[#3fd487] to-[#1c8a52] px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-sm transition hover:brightness-110"
          >
            <Download className="h-4 w-4" /> Download APK
          </a>

          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-xs text-[#5d7378]">
            {config.version && <Meta label="Version" value={config.version} />}
            {config.size_mb && <Meta label="Size" value={`${config.size_mb} MB`} />}
            {config.min_android && (
              <Meta label="Requires" value={`Android ${config.min_android}+`} />
            )}
          </dl>

          {config.release_notes && (
            <p className="mt-4 whitespace-pre-line rounded border border-black/[0.06] bg-[#f7fafa] p-4 text-xs text-[#5d7378]">
              {config.release_notes}
            </p>
          )}

          {config.ios_url && (
            <p className="mt-4 text-sm text-[#5d7378]">
              On iPhone?{' '}
              <a href={config.ios_url} className="font-bold text-[#0e7480] hover:underline">
                Install for iOS
              </a>
            </p>
          )}

          <ol className="mt-5 space-y-2 border-t border-black/[0.06] pt-5 text-sm text-[#13272b]">
            <Step n={1}>Tap “Download APK” and wait for the file to finish.</Step>
            <Step n={2}>
              Open it. If Android asks, allow installs from this source — that prompt is
              normal for apps outside the Play Store.
            </Step>
            <Step n={3}>Tap Install, then open the app and sign in as usual.</Step>
          </ol>
        </T4Card>
      ) : null}

      <p className="mt-4 text-center text-sm text-[#5d7378]">
        Everything also works in your mobile browser —{' '}
        <Link href="/" className="font-bold text-[#0e7480] hover:underline">
          start playing
        </Link>
        .
      </p>
    </T4FormPage>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <dt className="uppercase tracking-wide text-[#8aa0a4]">{label}</dt>
      <dd className="mt-0.5 font-black text-[#13272b]">{value}</dd>
    </div>
  );
}

function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#eef6f7] text-xs font-black text-[#0e7480]">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Pill({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-black/10 bg-white px-1.5 py-0.5 text-xs font-bold text-[#13272b]">
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

// iOS Safari exposes no install API — these steps are the only way in.
function IOSSteps() {
  return (
    <div className="rounded border border-black/[0.06] bg-[#f7fafa] p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-[#5d7378]">
        <Smartphone className="h-3.5 w-3.5" /> Install on iPhone or iPad (Safari)
      </p>
      <ol className="space-y-2.5">
        <Step n={1}>
          <span className="flex flex-wrap items-center gap-1.5">
            Tap the <Pill icon={Share} label="Share" /> button in Safari&apos;s toolbar.
          </span>
        </Step>
        <Step n={2}>
          <span className="flex flex-wrap items-center gap-1.5">
            Choose <Pill icon={Plus} label="Add to Home Screen" />.
          </span>
        </Step>
        <Step n={3}>Tap “Add” — the icon appears on your home screen.</Step>
      </ol>
    </div>
  );
}

// Already installed, Firefox, desktop Safari, in-app browsers: no prompt to give.
function GenericSteps() {
  return (
    <div className="rounded border border-black/[0.06] bg-[#f7fafa] p-4">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#5d7378]">
        Install from your browser
      </p>
      <p className="text-sm text-[#13272b]">
        Open your browser menu and choose{' '}
        <span className="font-bold">“Install app”</span> or{' '}
        <span className="font-bold">“Add to Home Screen”</span>. On desktop Chrome or
        Edge, look for the install icon at the end of the address bar.
      </p>
    </div>
  );
}
