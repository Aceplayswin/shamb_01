'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, X } from 'lucide-react';
import { toast } from '../../../../lib/toast';

/**
 * A real, scannable QR for a tracking link.
 *
 * What was here before was a hand-drawn SVG of rectangles arranged to look like
 * a QR code. It encoded nothing, was identical for every link, and the
 * "Download PNG" button had no handler at all — so a partner who printed it on
 * a flyer would have shipped a dead square.
 */
export default function QrCodeModal({ link, onClose }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [rendering, setRendering] = useState(true);

  const url = link.tracking_url;

  useEffect(() => {
    if (!canvasRef.current || !url) return;
    QRCode.toCanvas(
      canvasRef.current,
      url,
      {
        width: 220,
        margin: 2,
        // High correction, because these get printed and photographed.
        errorCorrectionLevel: 'H',
        color: { dark: '#0f172a', light: '#ffffff' },
      },
      (err) => {
        setRendering(false);
        if (err) toast.error('Could not render the QR code');
      },
    );
  }, [url]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `qr-${link.code || link.id}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-fade-up text-center">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black font-display text-slate-900 dark:text-slate-100">
            QR Code
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mx-auto flex h-[236px] w-[236px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700">
          {rendering && (
            <span className="text-xs text-slate-400">Generating…</span>
          )}
          <canvas
            ref={canvasRef}
            className={rendering ? 'hidden' : 'block'}
            aria-label={`QR code linking to ${url}`}
          />
        </div>

        <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-3 break-all px-4">
          {url}
        </p>

        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">{link.name}</p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 text-black font-bold text-xs shadow-sm hover:shadow-md hover:brightness-105 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Download PNG
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">
          Scan to open your tracking link. Safe to print — error correction is set
          to the highest level.
        </p>
      </div>
    </div>
  );
}
