'use client';

import { useEffect, useState } from 'react';

const MOCK_TICKERS = [
  { username: 'A*h', amount: 5000, type: 'deposit', timestamp: '2 mins ago' },
  { username: 'R*y', amount: 12000, type: 'win', timestamp: '5 mins ago' },
  { username: 'S*n', amount: 2500, type: 'withdrawal', timestamp: '8 mins ago' },
];

export function LiveTicker() {
  const [items, setItems] = useState(MOCK_TICKERS);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:5000/ws';
    let ws = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'ticker' && msg.data) {
          setItems((prev) => [msg.data, ...prev.slice(0, 9)]);
        }
      };
    } catch {
      // use mock data
    }
    return () => ws?.close();
  }, []);

  return (
    <aside className="card-glass hidden w-64 shrink-0 flex-col gap-4 p-4 xl:flex">
      <h3 className="text-sm font-semibold text-brand-400">Live Activity</h3>
      <TickerSection title="Deposits" items={items.filter((i) => i.type === 'deposit')} />
      <TickerSection title="Wins" items={items.filter((i) => i.type === 'win')} highlight />
      <TickerSection title="Withdrawals" items={items.filter((i) => i.type === 'withdrawal')} />
    </aside>
  );
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
