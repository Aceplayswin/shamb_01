'use client';

// The "send payment to" block under the method the player picked. Which rows
// appear is decided by the method's TYPE (lib/paymentDestination.js): UPI shows
// the QR code + UPI ID, bank the receiving account, crypto the network + wallet
// address, e-wallet the wallet id — never "whatever columns happen to be
// filled". Themes pass their own classes through `styles`; the structure and
// the copy behaviour are shared so the five themes cannot drift apart on what
// a player is told.

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  destinationRows,
  hasDestination,
  showsQr,
  TYPE_HINTS,
} from '@/lib/paymentDestination';

const DEFAULT_STYLES = {
  card: 'mt-4 rounded-xl border border-black/10 bg-white p-5',
  title: 'font-bold',
  note: 'mt-1 text-xs opacity-70',
  rows: 'mt-4 space-y-2',
  row: 'flex items-center justify-between gap-3 rounded-lg border border-black/10 px-4 py-3',
  label: 'text-[0.65rem] font-bold uppercase tracking-wide opacity-60',
  value: 'break-all font-semibold',
  mono: 'font-mono text-sm',
  copyBtn: 'shrink-0 rounded-md border border-black/10 px-3 py-1.5 text-xs font-bold',
  qrFrame: 'mt-4 flex justify-center',
  qrImg: 'h-44 w-44 max-w-full rounded-lg border border-black/10 bg-white object-contain p-1',
  instructions: 'mt-4 whitespace-pre-line rounded-lg bg-black/5 p-3 text-xs',
};

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Clipboard blocked (http origin, permissions) — the value is on screen
    // to read anyway, so this is silent.
    return false;
  }
}

export function ReceivingDetails({ method, styles = {}, title = 'Send payment to', note }) {
  const s = { ...DEFAULT_STYLES, ...styles };
  const [copied, setCopied] = useState('');
  // Clipboard is a browser-only, sometimes-absent API: decide after mount so
  // the server render and the first client render agree.
  const [canCopy, setCanCopy] = useState(false);

  useEffect(() => {
    setCanCopy(Boolean(navigator.clipboard?.writeText));
  }, []);

  // A stale "Copied" tick must not carry over to the next method's rows.
  useEffect(() => setCopied(''), [method?.code]);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(''), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  if (!hasDestination(method)) return null;
  const rows = destinationRows(method);

  return (
    <section className={s.card} aria-label={title}>
      <h2 className={s.title}>{title}</h2>
      <p className={s.note}>{note ?? TYPE_HINTS[method.method_type] ?? TYPE_HINTS.other}</p>

      {showsQr(method) && (
        <div className={s.qrFrame}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={method.qr_image_url} alt={`${method.name} QR code`} className={s.qrImg} />
        </div>
      )}

      {rows.length > 0 && (
        <dl className={s.rows}>
          {rows.map((row) => (
            <div key={row.label} className={s.row}>
              <div className="min-w-0 flex-1">
                <dt className={s.label}>{row.label}</dt>
                <dd className={`${s.value} ${row.mono ? s.mono : ''}`}>{row.value}</dd>
              </div>
              {canCopy && (
                <button
                  type="button"
                  onClick={async () => {
                    if (await copyText(row.value)) setCopied(row.label);
                  }}
                  className={s.copyBtn}
                  aria-label={`Copy ${row.label}`}
                >
                  {copied === row.label ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Copied
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </span>
                  )}
                </button>
              )}
            </div>
          ))}
        </dl>
      )}

      {method.instructions && <p className={s.instructions}>{method.instructions}</p>}
    </section>
  );
}

export default ReceivingDetails;
