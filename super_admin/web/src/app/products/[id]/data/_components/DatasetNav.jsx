'use client';

/* Every table the product has, grouped (Players, Finance, Games, …). A
   searchable sidebar on wide screens, a grouped picker on narrow ones. */

import { useMemo, useState } from 'react';
import { Lock, Search } from 'lucide-react';
import { datasetIcon, formatCount } from './ui';

const countText = (d) => (d.count === null || d.count === undefined ? '—' : `${d.estimated ? '~' : ''}${formatCount(d.count)}`);

export default function DatasetNav({ groups, datasets, active, onSelect }) {
  const [filter, setFilter] = useState('');

  const sections = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const matches = (d) => !term || d.label.toLowerCase().includes(term) || d.key.includes(term);
    const known = new Set((groups || []).map((g) => g.key));
    // Products that predate grouping send no groups: everything lands in one.
    const list = [...(groups || []), { key: '__rest', label: groups?.length ? 'Other' : 'Data' }];
    return list
      .map((g) => ({
        ...g,
        items: datasets.filter((d) => (g.key === '__rest' ? !known.has(d.group) : d.group === g.key) && matches(d)),
      }))
      .filter((g) => g.items.length);
  }, [groups, datasets, filter]);

  return (
    <>
      {/* Narrow screens: one grouped picker */}
      <div className="border-b border-gray-100 p-3 lg:hidden dark:border-gray-700">
        <select
          value={active || ''}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        >
          {sections.map((g) => (
            <optgroup key={g.key} label={g.label}>
              {g.items.map((d) => (
                <option key={d.key} value={d.key}>{d.label} ({countText(d)})</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Wide screens: searchable sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-100 lg:flex dark:border-gray-700">
        <div className="border-b border-gray-100 p-3 dark:border-gray-700">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={`Find a table (${datasets.length})…`}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-xs text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>
        </div>
        <nav className="max-h-[calc(100vh-14rem)] min-h-[24rem] flex-1 overflow-y-auto p-2">
          {sections.map((g) => (
            <div key={g.key} className="mb-1.5">
              <p className="px-2 pb-1 pt-2 text-[0.62rem] font-bold uppercase tracking-wider text-gray-400">{g.label}</p>
              {g.items.map((d) => {
                const Icon = datasetIcon(d.key, d.group);
                const isActive = d.key === active;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => onSelect(d.key)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/60'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{d.label}</span>
                    {d.read_only && (
                      <span title="Audit trail: read-only" className="shrink-0 opacity-60">
                        <Lock className="h-3 w-3" />
                      </span>
                    )}
                    <span
                      title={d.estimated ? 'Estimated; open the table for the exact count' : undefined}
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-bold tabular-nums ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {countText(d)}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          {!sections.length && <p className="px-2 py-6 text-center text-xs text-gray-400">No table matches.</p>}
        </nav>
      </aside>
    </>
  );
}
