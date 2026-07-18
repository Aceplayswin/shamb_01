'use client';

// Reports — download any dataset as CSV over a date range. The export streams
// from the API, so a large range does not have to be held in memory anywhere.

import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { API_URL, } from '@/services/tenant';
import { getAdminToken } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Card,
  Field,
  Input,
  toast,
  useAdminData,
} from '@/components/admin/AdminShell';

const DESCRIPTIONS = {
  users: 'Every registered player with balances, KYC and activity dates.',
  transactions: 'All money movements — deposits, withdrawals, bonuses, settlements.',
  deposits: 'Deposit transactions only, with method and reference.',
  withdrawals: 'Withdrawal requests with their approval status.',
  'bet-history': 'Play sessions per player: stakes, payouts and result.',
  rounds: 'Individual game rounds, including unsettled ones.',
  bonuses: 'Issued bonuses with wagering progress.',
};

// A quick range preset -> [from, to] as ISO dates.
function preset(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)];
}

export default function AdminReportsPage() {
  const { data: kinds, loading } = useAdminData('/api/v1/admin/reports');
  const [range, setRange] = useState({ from: '', to: '' });
  const [busy, setBusy] = useState(null);

  const download = async (kind) => {
    setBusy(kind);
    try {
      const params = new URLSearchParams();
      if (range.from) params.set('from', range.from);
      if (range.to) params.set('to', range.to);

      // Fetched with the admin token, then handed to the browser as a blob —
      // a plain link could not carry the Authorization header.
      const res = await fetch(
        `${API_URL}/api/v1/admin/reports/${kind}/export?${params}`,
        { headers: { Authorization: `Bearer ${getAdminToken()}` } },
      );
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminShell title="Reports" subtitle="Export platform data as CSV">
      <Card className="mb-5 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Date range
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="From">
            <Input
              type="date"
              value={range.from}
              onChange={(e) => setRange({ ...range, from: e.target.value })}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={range.to}
              onChange={(e) => setRange({ ...range, to: e.target.value })}
            />
          </Field>
          <div className="flex flex-wrap items-end gap-2 lg:col-span-2">
            {[
              ['Last 7 days', 7],
              ['Last 30 days', 30],
              ['Last 90 days', 90],
            ].map(([label, days]) => (
              <Button
                key={label}
                variant="secondary"
                size="sm"
                onClick={() => {
                  const [from, to] = preset(days);
                  setRange({ from, to });
                }}
              >
                {label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRange({ from: '', to: '' })}
            >
              All time
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {range.from || range.to
            ? `Exporting ${range.from || 'the beginning'} → ${range.to || 'today'}.`
            : 'No range set — exports cover all time.'}
        </p>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-900" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(kinds ?? []).map((k) => (
            <Card key={k.kind} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
                  <FileSpreadsheet className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white">{k.label}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {DESCRIPTIONS[k.kind] ?? 'CSV export'}
                  </p>
                </div>
              </div>
              <Button
                className="mt-4 w-full"
                variant="secondary"
                disabled={busy === k.kind}
                onClick={() => download(k.kind)}
                icon={busy === k.kind ? undefined : Download}
              >
                {busy === k.kind ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Preparing…
                  </>
                ) : (
                  'Download CSV'
                )}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
