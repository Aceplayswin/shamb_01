'use client';

/**
 * Game Order — reference screen `/sortbyweb`.
 *
 * The reference lets an operator drag games to rearrange them. Move up / move
 * down buttons do the same job here without a drag-and-drop dependency, and
 * stay usable by keyboard. Nothing is written until Save order.
 */

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Save, RotateCcw } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Card,
  ErrorState,
  Input,
  toast,
} from '@/components/admin/AdminShell';
import { useBackofficeData } from '@/components/admin/Backoffice';

export default function GameOrderPage() {
  const [query, setQuery] = useState('');
  const { data, loading, error, reload } = useBackofficeData(
    '/api/v1/admin/bo/game-order',
    {},
    { page: 0, pageSize: 500 },
  );

  const [order, setOrder] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.rows) {
      setOrder(data.rows);
      setDirty(false);
    }
  }, [data]);

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setDirty(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await adminApi('/api/v1/admin/bo/game-order/save', {
        method: 'PUT',
        body: JSON.stringify({ game_ids: order.map((g) => g.id) }),
      });
      toast.success('Game order saved');
      setDirty(false);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Filtering only narrows what is shown; the saved order is always the full
  // list, so searching can never silently drop games from the ordering.
  const term = query.trim().toLowerCase();
  const visible = term
    ? order.filter((g) => g.label.toLowerCase().includes(term))
    : order;

  return (
    <AdminShell
      title="Game Order"
      subtitle="This section allows you to sort games that appear on the web page."
      actions={
        <div className="flex gap-2">
          {dirty && (
            <Button variant="secondary" icon={RotateCcw} onClick={reload}>
              Discard
            </Button>
          )}
          <Button icon={Save} busy={busy} disabled={!dirty} onClick={save}>
            Save order
          </Button>
        </div>
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-sm text-slate-400">
              All available games are shown below and order is relevant. Move a
              game to rearrange the order players see.
            </p>
            <div className="mt-4 max-w-sm">
              <Input
                placeholder="Filter games…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {term && (
              <p className="mt-2 text-xs text-slate-500">
                Showing {visible.length} of {order.length}. Saving always writes
                the full list, not just the games shown.
              </p>
            )}
          </Card>

          <Card className="overflow-hidden">
            {loading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-800/60" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                No games match this filter.
              </p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {visible.map((g) => {
                  const index = order.indexOf(g);
                  return (
                    <li
                      key={g.id}
                      className="flex items-center justify-between gap-3 px-5 py-2.5"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="w-8 shrink-0 text-xs text-slate-500">
                          {index + 1}
                        </span>
                        <span className="truncate text-sm text-slate-200">
                          {g.label}
                        </span>
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={ArrowUp}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={ArrowDown}
                          disabled={index === order.length - 1}
                          onClick={() => move(index, 1)}
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
