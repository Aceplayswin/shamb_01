'use client';

/* Audit trail of every signed request Super Admin sent this product: each
   read, edit, create, delete and action (the webhook_deliveries table). */

import { Activity, CheckCircle2, ChevronDown, Clock, Loader2, RefreshCw, XCircle } from 'lucide-react';

function timeAgo(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const secs = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (secs < 60) return `${Math.floor(secs)}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return d.toLocaleString();
}

const DELIVERY_STATUS = {
  success: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', Icon: CheckCircle2 },
  failed: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', Icon: XCircle },
  pending: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', Icon: Clock },
};

const METHOD_TONE = {
  GET: 'text-gray-500 dark:text-gray-400',
  POST: 'text-emerald-600 dark:text-emerald-400',
  PATCH: 'text-indigo-600 dark:text-indigo-400',
  DELETE: 'text-red-600 dark:text-red-400',
};

export default function WebhookActivity({ deliveries, loading, open, onToggle, onRefresh }) {
  const failed = deliveries.filter((d) => d.status === 'failed').length;
  const writes = deliveries.filter((d) => d.request_method && d.request_method !== 'GET').length;
  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button type="button" onClick={onToggle} className="flex items-center gap-2.5 text-left">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Activity className="h-4 w-4" />
          </span>
          <span>
            <span className="flex items-center gap-1.5 font-display text-sm font-bold text-gray-900 dark:text-white">
              Webhook Activity
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </span>
            <span className="text-xs text-gray-400">
              {deliveries.length} recent {deliveries.length === 1 ? 'request' : 'requests'}
              {writes > 0 && <span className="ml-1">· {writes} {writes === 1 ? 'change' : 'changes'}</span>}
              {failed > 0 && <span className="ml-1 font-semibold text-red-500">· {failed} failed</span>}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {open && (loading && deliveries.length === 0 ? (
        <div className="flex items-center gap-2 border-t border-gray-100 p-6 text-gray-400 dark:border-gray-700">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading activity…
        </div>
      ) : deliveries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 border-t border-gray-100 p-8 text-center dark:border-gray-700">
          <Activity className="h-6 w-6 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-400">No webhook requests recorded yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                <th className="whitespace-nowrap px-4 py-2.5">When</th>
                <th className="whitespace-nowrap px-4 py-2.5">Method</th>
                <th className="whitespace-nowrap px-4 py-2.5">Resource</th>
                <th className="whitespace-nowrap px-4 py-2.5">Status</th>
                <th className="whitespace-nowrap px-4 py-2.5">HTTP</th>
                <th className="whitespace-nowrap px-4 py-2.5">Duration</th>
                <th className="whitespace-nowrap px-4 py-2.5">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {deliveries.map((d) => {
                const s = DELIVERY_STATUS[d.status] || DELIVERY_STATUS.pending;
                const method = d.request_method || 'GET';
                return (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-500 dark:text-gray-400" title={d.created_at || ''}>{timeAgo(d.created_at)}</td>
                    <td className={`whitespace-nowrap px-4 py-2.5 font-mono text-xs font-bold ${METHOD_TONE[method] || METHOD_TONE.GET}`}>{method}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-200" title={d.request_path || ''}>{d.resource}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase ${s.cls}`}>
                        <s.Icon className="h-3 w-3" /> {d.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-500 dark:text-gray-400">{d.http_status ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-500 dark:text-gray-400">{d.duration_ms != null ? `${d.duration_ms} ms` : '—'}</td>
                    <td className="max-w-[20rem] truncate px-4 py-2.5 text-red-500 dark:text-red-400" title={d.error || ''}>{d.error || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
