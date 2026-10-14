'use client';

// App install — serves the Android APK the product admin publishes from
// /admin/app (/api/v1/app/download). The download button points at
// /api/v1/app/apk, a stable redirect, so replacing the build does not break
// links or printed QR codes.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Download, Smartphone } from 'lucide-react';
import { API_URL } from '@/services/tenant';
import { api } from '@/services/api';
import { useBranding } from '@/hooks/useBranding';

const PERKS = [
  'Faster launches and smoother live tables',
  'Instant alerts for deposits, withdrawals and bet results',
  'One-tap login — no re-entering your number',
  'Play anywhere without keeping a browser tab open',
];

export default function Theme1AppDownload() {
  const branding = useBranding();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const available = config?.available;
  const downloadUrl = `${API_URL}/api/v1/app/apk`;

  return (
    <main className="mx-auto max-w-4xl flex-1 px-4 py-10">
      <div className="card-glass relative overflow-hidden p-8 sm:p-10">
        <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />

        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-300">
          <Smartphone className="h-3.5 w-3.5" /> Android app
        </span>

        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">
          Get the {branding.product_name} app
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-400">
          Install the Android app for the fastest way to play, deposit and track your
          bets.
        </p>

        {loading ? (
          <div className="mt-8 h-12 w-56 animate-pulse rounded-xl bg-white/[0.06]" />
        ) : available ? (
          <>
            <a
              href={downloadUrl}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 font-semibold text-surface-900 shadow-lg shadow-brand-500/20 transition hover:bg-brand-400"
            >
              <Download className="h-5 w-5" />
              Download APK
            </a>
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-xs text-slate-400">
              {config.version && <Meta label="Version" value={config.version} />}
              {config.size_mb && <Meta label="Size" value={`${config.size_mb} MB`} />}
              {config.min_android && (
                <Meta label="Requires" value={`Android ${config.min_android}+`} />
              )}
            </dl>
            {config.release_notes && (
              <p className="mt-4 max-w-xl whitespace-pre-line rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-slate-400">
                {config.release_notes}
              </p>
            )}
            {config.ios_url && (
              <p className="mt-4 text-sm text-slate-400">
                On iPhone?{' '}
                <a href={config.ios_url} className="text-brand-400 hover:underline">
                  Install for iOS
                </a>
              </p>
            )}
          </>
        ) : (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm font-semibold text-white">
              The app is not published yet
            </p>
            <p className="mt-1 text-sm text-slate-400">
              It is on the way. In the meantime everything works in your mobile
              browser —{' '}
              <Link href="/" className="text-brand-400 hover:underline">
                start playing
              </Link>
              .
            </p>
          </div>
        )}

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2 text-sm text-slate-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              {perk}
            </li>
          ))}
        </ul>
      </div>

      {available && (
        <section className="card-glass mt-5 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            How to install
          </h2>
          <ol className="mt-3 space-y-2 text-sm text-slate-300">
            <Step n={1}>Tap “Download APK” above and wait for the file to finish.</Step>
            <Step n={2}>
              Open it. If Android asks, allow installs from this source — that prompt is
              normal for apps outside the Play Store.
            </Step>
            <Step n={3}>Tap Install, then open the app and sign in as usual.</Step>
          </ol>
        </section>
      )}
    </main>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <dt className="uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-slate-200">{value}</dd>
    </div>
  );
}

function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
