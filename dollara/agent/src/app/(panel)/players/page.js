'use client';

import { useCallback, useState } from 'react';
import { Ban, CircleCheck, Wallet } from 'lucide-react';
import Card from '../_components/Card';
import CreateAccountModal from '../_components/CreateAccountModal';
import CreditModal from '../_components/CreditModal';
import { DataState } from '../../../components/ui/DataState';
import { Pagination } from '../../../components/ui/Pagination';
import { useAgent } from '../../../context/AgentContext';
import { useAgentData } from '../../../hooks/useAgentData';
import { money, signClass } from '../../../lib/format';
import { confirmDialog, toast } from '../../../lib/toast';
import { agentWrite } from '../../../services/agentApi';

const PER_PAGE = 25;

const COLUMNS = [
  'Username',
  'Available Bal',
  'Current P&L',
  'Exposure',
  'Type',
  'Actions',
];

export default function PlayersPage() {
  const { me, refresh } = useAgent();
  const [draft, setDraft] = useState({ playerId: '', username: '' });
  const [applied, setApplied] = useState({ playerId: '', username: '' });
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [crediting, setCrediting] = useState(null);

  const query = new URLSearchParams({
    page: String(page),
    perPage: String(PER_PAGE),
  });
  if (applied.playerId) query.set('playerId', applied.playerId);
  if (applied.username) query.set('username', applied.username);

  const { data, loading, error, reload } = useAgentData(
    `/api/v1/agent/players?${query.toString()}`,
    [query.toString()],
  );

  const search = (event) => {
    event.preventDefault();
    setApplied(draft);
    setPage(0);
  };

  const cancel = () => {
    setDraft({ playerId: '', username: '' });
    setApplied({ playerId: '', username: '' });
    setPage(0);
  };

  const toggleStatus = useCallback(
    async (player) => {
      const blocking = player.status === 'active';
      const ok = await confirmDialog({
        title: blocking ? `Block ${player.username}?` : `Unblock ${player.username}?`,
        text: blocking
          ? 'They will not be able to log in or place bets.'
          : 'They will be able to log in and bet again.',
        confirmText: blocking ? 'Block' : 'Unblock',
        danger: blocking,
      });
      if (!ok) return;
      try {
        await agentWrite(
          `/api/v1/agent/players/${player.id}`,
          { status: blocking ? 'blocked' : 'active' },
          'PATCH',
        );
        toast.success(blocking ? 'Player blocked' : 'Player unblocked');
        reload();
      } catch (e) {
        toast.error(e.message || 'Could not update the player');
      }
    },
    [reload],
  );

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      <Card title="Players">
        <form onSubmit={search} className="rounded bg-panel-sunken p-5">
          <div className="grid items-end gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="player-id" className="field-label">
                Player ID
              </label>
              <input
                id="player-id"
                value={draft.playerId}
                onChange={(e) => setDraft({ ...draft, playerId: e.target.value })}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="player-username" className="field-label">
                Username
              </label>
              <input
                id="player-username"
                value={draft.username}
                onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                className="field"
              />
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
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="btn-primary ml-auto"
          >
            Create Account
          </button>
        }
      >
        <h2 className="mb-4 text-base font-semibold text-ink">List Of Players</h2>

        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                {COLUMNS.map((column, index) => (
                  <th key={column} className={index > 0 && index < 4 ? 'text-right' : ''}>
                    {column}
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
                {rows.map((player) => (
                  <tr key={player.id}>
                    <td>
                      <span className="font-medium text-ink">{player.username}</span>
                      <span className="ml-1 text-ink-faint">({player.id})</span>
                    </td>
                    <td className="num">{money(player.availableBalance)}</td>
                    <td className={`num ${signClass(player.currentPl)}`}>
                      {money(player.currentPl)}
                    </td>
                    <td className="num">{money(player.exposure)}</td>
                    <td>{player.type}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setCrediting(player)}
                          className="inline-flex items-center gap-1 rounded border border-hairline px-2.5 py-1.5 text-xs text-ink-muted transition hover:bg-panel-hover hover:text-ink"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                          Credit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(player)}
                          className={`inline-flex items-center gap-1 rounded border border-hairline px-2.5 py-1.5 text-xs transition hover:bg-panel-hover ${
                            player.status === 'active' ? 'text-down' : 'text-up'
                          }`}
                        >
                          {player.status === 'active' ? (
                            <>
                              <Ban className="h-3.5 w-3.5" />
                              Block
                            </>
                          ) : (
                            <>
                              <CircleCheck className="h-3.5 w-3.5" />
                              Unblock
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
          noun="player"
        />
      </Card>

      {creating && (
        <CreateAccountModal
          kind="player"
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
          targetType="player"
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
