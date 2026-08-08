'use client';

import { useState } from 'react';
import {
  Key,
  RefreshCcw,
  Lock,
  ExternalLink,
  Clipboard,
  Terminal,
  FileText,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';


const API_DOCS_URL = 'https://docs.dollara.com/affiliate-integration';
const DEFAULT_WEBHOOK_URL = 'https://affiliate.dollara.example/webhooks/postback';


// just some fake logs for the table
const initialLogs = [
  {
    id: 'LOG-001',
    time: '2026-08-05 10:12',
    direction: 'Inbound',
    endpoint: '/api/v1/affiliate/webhook/postback',
    status: '200 OK',
    signature: 'Valid',
    note: 'Deposit event received',
  },
  {
    id: 'LOG-002',
    time: '2026-08-05 09:44',
    direction: 'Outbound',
    endpoint: '/api/v1/affiliate/data/referrals',
    status: '403 Forbidden',
    signature: 'Missing',
    note: 'Missing auth header',
  },
  {
    id: 'LOG-003',
    time: '2026-08-04 17:31',
    direction: 'Inbound',
    endpoint: '/api/v1/affiliate/webhook/postback',
    status: '202 Accepted',
    signature: 'Valid',
    note: 'Round settlement sent',
  },
];


function randomKeySuffix() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

// build a fake keypair for the demo
function buildKeyPair() {
  const keyId = `AFF-${Date.now().toString(36).toUpperCase()}-${randomKeySuffix()}`;

  return {
    id: keyId,
    status: 'active',
    createdAt: new Date().toISOString().slice(0, 10),
    rotatedAt: null,
    publicKey: `-----BEGIN PUBLIC KEY-----\nAFFILIATE-${keyId}-PUBLIC-KEY\n-----END PUBLIC KEY-----`,
    privateKey: `-----BEGIN PRIVATE KEY-----\nAFFILIATE-${keyId}-PRIVATE-KEY\n-----END PRIVATE KEY-----`,
    privateShown: true,
  };
}

function downloadBlob(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}


export default function SettingsApiPage() {
  const [apiKey, setApiKey] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK_URL);
  const [savedWebhookUrl, setSavedWebhookUrl] = useState(DEFAULT_WEBHOOK_URL);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [logs] = useState(initialLogs);


  const handleGenerateKey = () => {
    setApiKey(buildKeyPair());
  };

  const handleRotateKey = () => {
    if (!apiKey) return;

    setApiKey((current) => ({
      ...buildKeyPair(),
      status: 'rotating',
      rotatedAt: new Date().toISOString().slice(0, 10),
    }));
  };

  const handleRevokeKey = () => {
    if (!apiKey) return;

    setApiKey((current) => ({
      ...current,
      status: 'revoked',
      privateShown: false,
    }));
  };

  const handleSaveWebhook = () => {
    setSavedWebhookUrl(webhookUrl);
    setWebhookSaved(true);
    // hide the "Saved" message after a couple seconds
    window.setTimeout(() => setWebhookSaved(false), 2200);
  };

  const handleDownloadPrivateKey = () => {
    if (!apiKey?.privateKey) return;
    downloadBlob(`${apiKey.id}-private-key.pem`, apiKey.privateKey);
  };


  const statusClasses = {
    active: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    rotating: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    revoked: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  };


  return (
    <div className="space-y-6 animate-fade-up">

      {/* page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">
            API & Integration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate signed API credentials, configure your webhook endpoint, and review recent signed call activity.
          </p>
        </div>

        <a
          href={API_DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
        >
          <ExternalLink className="w-4 h-4" /> View API docs
        </a>
      </div>


      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">

        {/* left column */}
        <div className="space-y-4">

          {/* keypair section */}
          <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  API keypair
                </h2>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Generate a keypair for signed webhook calls and API access. The private key is shown only once.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {!apiKey && (
                  <button
                    type="button"
                    onClick={handleGenerateKey}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 text-black font-bold text-sm shadow-sm hover:shadow-md hover:brightness-105 transition-all"
                  >
                    <Key className="w-4 h-4" /> Generate keypair
                  </button>
                )}

                {apiKey && apiKey.status !== 'revoked' && (
                  <>
                    <button
                      type="button"
                      onClick={handleRotateKey}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-950/80 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-900 transition-all"
                    >
                      <RefreshCcw className="w-4 h-4" /> Rotate key
                    </button>

                    <button
                      type="button"
                      onClick={handleRevokeKey}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-300 bg-rose-500/10 text-rose-500 text-sm font-semibold hover:bg-rose-500/20 transition-all"
                    >
                      <Lock className="w-4 h-4" /> Revoke key
                    </button>
                  </>
                )}

                {apiKey?.status === 'revoked' && (
                  <button
                    type="button"
                    onClick={handleGenerateKey}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 text-black font-bold text-sm shadow-sm hover:shadow-md hover:brightness-105 transition-all"
                  >
                    <Key className="w-4 h-4" /> Generate new key
                  </button>
                )}
              </div>
            </div>

            {apiKey ? (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[apiKey.status]}`}
                  >
                    {apiKey.status}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Key ID: {apiKey.id}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Created: {apiKey.createdAt}
                  </span>
                  {apiKey.rotatedAt && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Rotated: {apiKey.rotatedAt}
                    </span>
                  )}
                </div>

                {/* public key */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    Public key
                  </label>
                  <textarea
                    readOnly
                    value={apiKey.publicKey}
                    rows={4}
                    className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-4 py-3 text-xs text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>

                {/* private key - only shown once */}
                {apiKey.privateShown ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                        Private key (shown once)
                      </label>
                      <button
                        type="button"
                        onClick={handleDownloadPrivateKey}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 transition-all"
                      >
                        <Clipboard className="w-4 h-4" /> Download PEM
                      </button>
                    </div>

                    <textarea
                      readOnly
                      value={apiKey.privateKey}
                      rows={4}
                      className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-4 py-3 text-xs text-slate-800 dark:text-slate-100 font-mono"
                    />

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Store the private key securely. It is not retrievable after you leave this screen.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-4 text-sm text-slate-600 dark:text-slate-300">
                    Your private key has already been shown or this key is revoked. If you need access again, rotate or generate a new key.
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-6 text-sm text-slate-500 dark:text-slate-400">
                No API credentials have been issued yet. Generate a keypair to start using the affiliate API and signed webhooks.
              </div>
            )}
          </section>


          {/* webhook section */}
          <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Webhook endpoint
                </h2>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Configure the endpoint where affiliate webhook events are posted. Use HTTPS and verify the request signatures.
                </p>
              </div>

              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-950/80 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <Terminal className="w-3.5 h-3.5" /> Signed webhook
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
                className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveWebhook}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-black text-sm font-semibold hover:bg-brand-600 transition-all"
                >
                  Save webhook URL
                </button>

                {webhookSaved && (
                  <span className="text-xs text-emerald-400">Saved</span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current webhook URL:{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {savedWebhookUrl}
                </span>
              </p>
            </div>
          </section>
        </div>


        {/* right side - checklist */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-semibold">Signed integration checklist</span>
          </div>

          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-3">
              <div className="font-semibold">Signing headers</div>
              <div className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                Use `X-Aff-Key-Id`, `X-Aff-Timestamp`, `X-Aff-Nonce`, and `X-Aff-Signature`.
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-3">
              <div className="font-semibold">Webhook delivery</div>
              <div className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                The webhook URL must be HTTPS and verify the returned signature.
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-3">
              <div className="font-semibold">Request log</div>
              <div className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                Review the last N signed calls below for debugging and validation.
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-950/80 p-4">
            <div className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-400">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Integration resources
              </div>
              <a
                href={API_DOCS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200"
              >
                Open docs <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-sm">
                <div className="font-semibold">Webhook endpoint</div>
                <div className="mt-1 text-slate-500 dark:text-slate-400">{savedWebhookUrl}</div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-sm">
                <div className="font-semibold">Signed request example</div>
                <div className="mt-1 text-slate-500 dark:text-slate-400">
                  POST /api/v1/affiliate/webhook/postback
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-sm">
                <div className="font-semibold">Key header</div>
                <div className="mt-1 text-slate-500 dark:text-slate-400">X-Aff-Key-Id</div>
              </div>
            </div>
          </div>
        </section>
      </div>


      {/* request log table */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-black font-display text-slate-900 dark:text-slate-100">
              Signed request log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              The most recent signed webhook and API call activity for debugging.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-950/80 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <FileText className="w-4 h-4" /> Last {logs.length} events
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/40 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">When</th>
                <th className="p-4">Direction</th>
                <th className="p-4">Endpoint</th>
                <th className="p-4">Status</th>
                <th className="p-4">Signature</th>
                <th className="p-4">Note</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-4 text-slate-600 dark:text-slate-300">{entry.time}</td>
                  <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">
                    {entry.direction}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{entry.endpoint}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{entry.status}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{entry.signature}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">{entry.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}