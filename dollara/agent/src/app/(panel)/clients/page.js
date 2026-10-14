'use client';

import { useCallback, useState } from 'react';
import { Lock, LockOpen, Wallet } from 'lucide-react';
import Card from '../_components/Card';
import CreateAccountModal from '../_components/CreateAccountModal';
import CreditModal from '../_components/CreditModal';
import { DataState } from '../../../components/ui/DataState';
import { Pagination } from '../../../components/ui/Pagination';
import { useAgent } from '../../../context/AgentContext';
import { useAgentData } from '../../../hooks/useAgentData';
import { label, money, num, pct, signClass } from '../../../lib/format';
import { confirmDialog, toast } from '../../../lib/toast';
import { agentWrite } from '../../../services/agentApi';

const PER_PAGE = 25;

const COLUMNS = [
  { label: 'Username', align: 'left' },
  { label: 'Level', align: 'left' },
  { label: 'Credit Ref', align: 'right' },
  { label: 'Balance', align: 'right' },
  { label: 'Exposure', align: 'right' },
  { label: 'Available', align: 'right' },
  { label: 'Partnership', align: 'right' },
  { label: 'Players', align: 'right' },
  { label: 'Status', align: 'left' },
  { label: 'Actions', align: 'left' },
];

/**
 * The agent accounts directly below this one.
 *
 * One level of the tree, not the whole subtree: an agent manages who it
 * created, and reaches deeper accounts by opening one of them. The reports are
 * where the whole downline is aggregated.
 */
export default function ClientsPage() {
  const { me, refresh } = useAgent();
  const [draft, setDraft] = useState({ search: '', status: '' });
  const [applied, setApplied] = useState({ search: '', status: '' });
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [crediting, setCrediting] = useState(null);

  const query = new URLSearchParams({
    page: String(page),
    perPage: String(PER_PAGE),
  });
  if (applied.search) query.set('search', applied.search);
  if (applied.status) query.set('status', applied.status);

  const { data, loading, error, reload } = useAgentData(
    `/api/v1/agent/clients?${query.toString()}`,
    [query.toString()],
  );

  const search = (event) => {
    event.preventDefault();
    setApplied(draft);
    setPage(0);
  };

  const cancel = () => {
    setDraft({ search: '', status: '' });
    setApplied({ search: '', status: '' });
    setPage(0);
  };

  const toggleBetLock = useCallback(
    async (client) => {
      const locking = !client.betLocked;
      const ok = await confirmDialog({
        title: locking ? `Lock betting for ${client.username}?` : `Unlock ${client.username}?`,
        text: locking
          ? 'They and everyone below them stop taking new bets. Existing bets are unaffected.'
          : 'They can take new bets again.',
        confirmText: locking ? 'Lock betting' : 'Unlock',
        danger: locking,
      });
      if (!ok) return;
      try {
        await agentWrite(
          `/api/v1/agent/clients/${client.id}`,
          { betLocked: locking },
          'PATCH',
        );
        toast.success(locking ? 'Betting locked' : 'Betting unlocked');
        reload();
      } catch (e) {
        toast.error(e.message || 'Could not update the account');
      }
    },
    [reload],
  );

  const rows = data?.rows ?? [];
  const canCreate = (me?.canCreate ?? []).length > 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <Card title="Clients">
        <form onSubmit={search} className="rounded bg-panel-sunken p-5">
          <div className="grid items-end gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="client-search" className="field-label">
                Username or Name
              </label>
              <input
                id="client-search"
                value={draft.search}
                onChange={(e) => setDraft({ ...draft, search: e.target.value })}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="client-status" className="field-label">
                Status
              </label>
              <select
                id="client-status"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                className="field"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="locked">Locked</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">
                Search
              </button>
              <button type="button" onClick={cancel} className="btn-cancel">
                Cancel
              </button>
            </div>
          </div>
        </form>
      </Card>

      <Card
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="btn-primary ml-auto"
            >
              Create Account
            </button>
          ) : null
        }
      >
        <h2 className="mb-4 text-base font-semibold text-ink">List Of Clients</h2>

        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={column.label}
                    className={column.align === 'right' ? 'text-right' : undefined}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <DataState
                loading={loading}
                error={error}
                empty={!rows.length}
                onRetry={reload}
                colSpan={COLUMNS.length}
                skeleton={
                  <tr>
                    <td colSpan={COLUMNS.length} className="!p-0">
                      <div className="h-24 animate-pulse bg-panel-head/50" />
                    </td>
                  </tr>
                }
              >
                {rows.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <span className="font-medium text-ink">{client.username}</span>
                      <span className="ml-1 text-ink-faint">{client.code}</span>
                    </td>
                    <td>{client.levelLabel}</td>
                    <td className="num">{money(client.creditReference)}</td>
                    <td className="num">{money(client.balance)}</td>
                    <td className="num">{money(client.exposure)}</td>
                    <td className={`num ${signClass(client.availableCredit)}`}>
                      {money(client.availableCredit)}
                    </td>
                    <td className="num">{pct(client.partnership)}</td>
                    <td className="num">{num(client.players)}</td>
                    <td>
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          client.status === 'active'
                            ? 'bg-up/15 text-up'
                            : 'bg-down/15 text-down'
                        }`}
                      >
                        {label(client.status)}
                        {client.betLocked ? ' · bet locked' : ''}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setCrediting(client)}
                          className="inline-flex items-center gap-1 rounded border border-hairline px-2.5 py-1.5 text-xs text-ink-muted transition hover:bg-panel-hover hover:text-ink"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                          Credit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBetLock(client)}
                          className={`inline-flex items-center gap-1 rounded border border-hairline px-2.5 py-1.5 text-xs transition hover:bg-panel-hover ${
                            client.betLocked ? 'text-up' : 'text-down'
                          }`}
                        >
                          {client.betLocked ? (
                            <>
                              <LockOpen className="h-3.5 w-3.5" />
                              Unlock
                            </>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5" />
                              Lock Bets
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </DataState>
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          total={data?.total ?? 0}
          perPage={PER_PAGE}
          onPage={setPage}
          noun="client"
        />
      </Card>

      {creating && (
        <CreateAccountModal
          kind="client"
          levels={me?.canCreate ?? []}
          onClose={() => setCreating(false)}
          onDone={() => {
            reload();
            refresh();
          }}
        />
      )}

      {crediting && (
        <CreditModal
          target={crediting}
          targetType="agent"
          myBalance={me?.balance}
          onClose={() => setCrediting(null)}
          onDone={() => {
            reload();
            refresh();
          }}
        />
      )}
    </div>
  );
}
