'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AdminShell,
  DataTable,
  ErrorState,
  fmtDate,
  inr,
  useAdminData,
} from '@/components/admin/AdminShell';
import { ArrowLeftRight, Scale, Landmark } from 'lucide-react';

/**
 * The money the agent programme moves.
 *
 * Read-only on purpose. Credit is adjusted from the account it belongs to — the
 * Credit button on the agent list, or the same action on a detail page — so
 * there is exactly one place a balance can change and it is always next to the
 * balance it changes. This screen is the ledger those actions write to, plus
 * the settlements agents post between themselves.
 */
export default function AgentCreditPage() {
  const [activeTab, setActiveTab] = useState('transfers');

  const transfersQuery = useAdminData('/api/v1/admin/agents/transfers?limit=300', []);
  const settlementsQuery = useAdminData('/api/v1/admin/agents/settlements?limit=300', []);

  const transfers = transfersQuery.data?.records ?? [];
  const settlements = settlementsQuery.data?.records ?? [];
  const transferSummary = transfersQuery.data?.summary;
  const settlementSummary = settlementsQuery.data?.summary;

  const agentCell = (r) => (
    <Link href={`/agents/${r.agent_id}`} className="font-medium text-blue-400 hover:underline">
      {r.agent_name}
    </Link>
  );

  const transferColumns = [
    { key: 'created_at', label: 'When', render: (r) => (
      <span className="whitespace-nowrap text-sm text-slate-400">{fmtDate(r.created_at)}</span>
    )},
    { key: 'agent_name', label: 'Agent', render: agentCell },
    { key: 'counterparty', label: 'Counterparty', render: (r) => (
      // A self-referencing row is a platform injection, not a transfer to
      // itself — see the Credit section of core/agent_admin_services.py.
      r.is_platform ? (
        <span className="inline-flex items-center gap-1.5 rounded bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-400">
          <Landmark size={12} />
          Platform
        </span>
      ) : (
        <div>
          <span className="text-slate-200">{r.counterparty}</span>
          <p className="text-xs capitalize text-slate-500">{r.counterparty_type}</p>
        </div>
      )
    )},
    {
      key: 'direction',
      label: 'Direction',
      render: (r) => (
        <span className={r.direction === 'down' ? 'text-rose-400' : 'text-emerald-400'}>
          {r.direction === 'down' ? 'Credit down' : 'Credit up'}
        </span>
      ),
      filter: 'select',
      filterOptions: [
        { value: 'down', label: 'Credit down' },
        { value: 'up', label: 'Credit up' },
      ],
    },
    { key: 'amount', label: 'Amount', render: (r) => (
      // Signed from the performing agent's own side: down is credit leaving them.
      <span className={r.direction === 'down' ? 'font-semibold text-rose-400' : 'font-semibold text-emerald-400'}>
        {r.direction === 'down' ? '−' : '+'}{inr(r.amount)}
      </span>
    )},
    { key: 'balance_after', label: 'Balance after', render: (r) => (
      <span className="text-slate-300">{inr(r.balance_after)}</span>
    )},
    { key: 'remark', label: 'Remark', render: (r) => (
      <span className="text-sm text-slate-400">{r.remark}</span>
    )},
  ];

  const settlementColumns = [
    { key: 'created_at', label: 'When', render: (r) => (
      <span className="whitespace-nowrap text-sm text-slate-400">{fmtDate(r.created_at)}</span>
    )},
    { key: 'agent_name', label: 'Agent', render: agentCell },
    { key: 'counterparty', label: 'Counterparty', render: (r) => (
      <div>
        <span className="text-slate-200">{r.counterparty}</span>
        <p className="text-xs capitalize text-slate-500">{r.counterparty_type}</p>
      </div>
    )},
    { key: 'period_start', label: 'Period', render: (r) => (
      <span className="text-slate-400">
        {r.period_start ? `${r.period_start} → ${r.period_end}` : '—'}
      </span>
    )},
    { key: 'amount', label: 'Settled', render: (r) => (
      // Signed from the agent's side: positive means the counterparty owed them
      // and has now paid.
      <span className={r.amount >= 0 ? 'font-semibold text-emerald-400' : 'font-semibold text-rose-400'}>
        {inr(r.amount)}
      </span>
    )},
    { key: 'pl_before', label: 'P&L before', render: (r) => (
      <span className="text-slate-400">{inr(r.pl_before)}</span>
    )},
    { key: 'pl_after', label: 'P&L after', render: (r) => (
      <span className="text-slate-300">{inr(r.pl_after)}</span>
    )},
    { key: 'note', label: 'Note', render: (r) => (
      <span className="text-sm text-slate-400">{r.note}</span>
    )},
  ];

  return (
    <AdminShell
      title="Credit & Settlement"
      subtitle={
        `${inr(transferSummary?.credit_down ?? 0)} pushed down · `
        + `${inr(transferSummary?.credit_up ?? 0)} pulled up · `
        + `${inr(settlementSummary?.settled ?? 0)} settled`
      }
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Credit &amp; Settlement</h2>
        <p className="text-slate-400">
          Every credit movement and settled balance across the agent tree. Adjust
          an agent&apos;s credit from the agent list or their detail page.
        </p>
      </div>

      <div className="mb-6 flex overflow-x-auto border-b border-slate-800">
        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'transfers'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200'
          }`}
        >
          <ArrowLeftRight size={16} />
          Credit Transfers
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'settlements'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200'
          }`}
        >
          <Scale size={16} />
          Settlements
        </button>
      </div>

      {activeTab === 'transfers' &&
        (transfersQuery.error ? (
          <ErrorState message={transfersQuery.error} onRetry={transfersQuery.reload} />
        ) : (
          <DataTable
            columns={transferColumns}
            rows={transfers}
            loading={transfersQuery.loading}
            searchable
            searchKeys={['agent_name', 'counterparty', 'remark']}
            searchPlaceholder="Search by agent, counterparty, remark…"
            noun="transfer"
            pageSize={25}
            emptyIcon={ArrowLeftRight}
            emptyMessage="No credit movements yet"
            emptyHint="Opening credit, downline transfers and platform adjustments all land here."
          />
        ))}

      {activeTab === 'settlements' &&
        (settlementsQuery.error ? (
          <ErrorState message={settlementsQuery.error} onRetry={settlementsQuery.reload} />
        ) : (
          <DataTable
            columns={settlementColumns}
            rows={settlements}
            loading={settlementsQuery.loading}
            searchable
            searchKeys={['agent_name', 'counterparty', 'note']}
            searchPlaceholder="Search settlements…"
            noun="settlement"
            pageSize={25}
            emptyIcon={Scale}
            emptyMessage="Nothing settled yet"
            emptyHint="Agents settle accrued P&L with their downline from the panel."
          />
        ))}
    </AdminShell>
  );
}
