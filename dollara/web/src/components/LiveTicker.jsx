'use client';

import { useEffect, useState } from 'react';
import { useBigWins } from '@/components/BigWins';

export function LiveTicker() {
  // Real settled wins from the API (names masked server-side), topped up by any
  // live events pushed over the websocket.
  const { wins } = useBigWins(10);
  const [live, setLive] = useState([]);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:5000/ws';
    let ws = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'ticker' && msg.data) {
          setLive((prev) => [msg.data, ...prev.slice(0, 9)]);
        }
      };
    } catch {
      // No live feed available — the fetched wins below still render.
    }
    return () => ws?.close();
  }, []);

  const winItems = [
    ...live.filter((i) => i.type === 'win'),
    ...wins.map((w) => ({
      username: w.username,
      amount: w.win_amount,
      timestamp: relativeTime(w.created_at),
    })),
  ];

  return (
    <aside className="card-glass hidden w-64 shrink-0 flex-col gap-4 p-4 xl:flex">
      <h3 className="text-sm font-semibold text-brand-400">Live Activity</h3>
      <TickerSection title="Recent big wins" items={winItems} highlight />
      <TickerSection
        title="Deposits"
        items={live.filter((i) => i.type === 'deposit')}
      />
      <TickerSection
        title="Withdrawals"
        items={live.filter((i) => i.type === 'withdrawal')}
      />
    </aside>
  );
}

function relativeTime(iso) {
  if (!iso) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function TickerSection({ title, items, highlight }) {
  return (
    <div>
      <h4 className="mb-2 text-xs uppercase text-muted/80">{title}</h4>
      <ul className="space-y-2">
        {items.slice(0, 5).map((item, i) => (
          <li
            key={`${item.username}-${i}`}
            className={`rounded-lg bg-panel/50 px-2 py-1.5 text-xs ${
              highlight && item.amount >= 10000 ? 'animate-pulse-glow border border-brand-500/30' : ''
            }`}
          >
            <span className="text-app-fg/80">{item.username}</span>
            <span className="ml-1 text-green-400">₹{item.amount.toLocaleString('en-IN')}</span>
            <span className="block text-muted/80">{item.timestamp}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
