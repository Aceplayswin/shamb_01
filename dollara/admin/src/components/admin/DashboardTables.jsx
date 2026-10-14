'use client';

/**
 * The dashboard breakdown tables. A small local table primitive is used rather
 * than the full DataTable — these are static, unpaginated, read-only panels.
 */

import { Card, inr } from '@/components/admin/AdminShell';

const num = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// dollara's AdminShell does not export a seconds-precision time formatter
// (only `fmtDate`, which rounds to the minute and uses the browser's local
// zone), so it is defined locally here rather than editing that shared file.
// Pinned to IST to match the player site, same as the API's UTC stamps
// require.
const TIME_PARTS = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
};

// Seconds included: two rows landing in the same minute must stay orderable.
const time = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', TIME_PARTS);
};

function Panel({ title, columns, rows, renderRow }) {
  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-bold text-white">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  className="border border-slate-800 bg-slate-800/50 px-3 py-2.5 text-left text-xs font-semibold text-slate-300"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="border border-slate-800 px-3 py-4 text-center text-slate-500"
                >
                  No Records Found
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id ?? r.date ?? r.userId ?? i} className="odd:bg-slate-900/40">
                  {renderRow(r, i).map((cell, j) => (
                    <td key={j} className="border border-slate-800 px-3 py-2.5 text-slate-300">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function DashboardTables({ data }) {
  const d = data ?? {};

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <Panel
        title="Deposits Last 7 Days"
        columns={['Date', 'Amount (₹)', 'Deposit Count', 'Average']}
        rows={d.deposits ?? []}
        renderRow={(r) => [r.date, num(r.amount), r.count, num(r.average)]}
      />

      <Panel
        title="Withdrawals Last 7 Days"
        columns={['Date', 'Amount (₹)', 'Withdrawals Count', 'Average']}
        rows={d.withdrawals ?? []}
        renderRow={(r) => [r.date, num(r.amount), r.count, num(r.average)]}
      />

      <Panel
        title="Registered Members Last 7 Days"
        columns={['Date', 'Count', 'Had Deposit', 'Conversion Rate']}
        rows={d.registered ?? []}
        renderRow={(r) => [r.date, r.count, r.hadDeposit, num(r.conversionRate)]}
      />

      <Panel
        title="Deposit Count Top 10 Today"
        columns={['#', 'Player', 'Count', 'Total Deposit']}
        rows={d.depositCountTop ?? []}
        renderRow={(r, i) => [i + 1, r.player, r.count, inr(r.total)]}
      />

      <Panel
        title="Deposit Max Top 10 Today"
        columns={['#', 'Player', 'Amount (₹)', 'Time', 'Deposit Method']}
        rows={d.depositMaxTop ?? []}
        renderRow={(r, i) => [i + 1, r.player, num(r.amount), time(r.time), r.method]}
      />

      <Panel
        title="Withdraw Count Top 10 Today"
        columns={['#', 'Player', 'Count', 'Total Withdraw']}
        rows={d.withdrawCountTop ?? []}
        renderRow={(r, i) => [i + 1, r.player, r.count, inr(r.total)]}
      />
    </div>
  );
}
