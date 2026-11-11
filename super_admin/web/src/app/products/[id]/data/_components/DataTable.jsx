'use client';

/* One page of a dataset. Headers sort, id columns link to the record they
   point at, booleans flip in place, and every row opens in the editor. */

import { useMemo } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Box, Eye, Loader2, Pencil, Trash2 } from 'lucide-react';
import { formatCell, humanize, StatusPill, STATUS_COLS } from './ui';

const ICON_BUTTON =
  'inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors';

export default function DataTable({
  columns, fields, rows, refLabels, sort, dir, onSort, onOpenRow, onOpenRef,
  onToggle, toggling, onDelete, editable, emptyText,
}) {
  const fieldMap = useMemo(
    () => Object.fromEntries((fields || []).map((f) => [f.name, f])),
    [fields],
  );

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
          <Box className="h-6 w-6 text-gray-400" />
        </span>
        <p className="text-sm text-gray-400">{emptyText}</p>
      </div>
    );
  }

  const renderCell = (col, row) => {
    const field = fieldMap[col];
    const value = row[col];

    if (field?.type === 'boolean' && typeof value === 'boolean') {
      if (editable && field.editable && onToggle) {
        const busy = toggling === `${row.id}:${col}`;
        return (
          <button
            type="button"
            disabled={busy}
            title={`Click to set ${value ? 'No' : 'Yes'}`}
            onClick={(e) => { e.stopPropagation(); onToggle(row, col); }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold uppercase transition-colors disabled:opacity-60 ${
              value
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {busy
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <span className={`h-1.5 w-1.5 rounded-full ${value ? 'bg-emerald-500' : 'bg-gray-400'}`} />}
            {value ? 'Yes' : 'No'}
          </button>
        );
      }
      return <span>{value ? 'Yes' : 'No'}</span>;
    }

    if (STATUS_COLS.has(col) && value) return <StatusPill value={value} />;

    if (field?.ref && value !== null && value !== undefined && value !== '' && onOpenRef) {
      const label = refLabels?.[col]?.[String(value)];
      return (
        <button
          type="button"
          title={`Open ${humanize(field.ref)} #${value}`}
          onClick={(e) => { e.stopPropagation(); onOpenRef(field.ref, value); }}
          className="-mx-1.5 inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
        >
          <span className="font-semibold tabular-nums">#{value}</span>
          {label && <span className="truncate text-gray-500 dark:text-gray-400">{label}</span>}
        </button>
      );
    }

    const text = formatCell(value);
    return <span className="block truncate" title={text}>{text}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
            {columns.map((col) => {
              const active = sort === col;
              const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
              return (
                <th key={col} className="whitespace-nowrap px-4 py-3">
                  {onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col)}
                      title="Sort"
                      className={`group inline-flex items-center gap-1 uppercase ${active ? 'text-indigo-600 dark:text-indigo-400' : 'hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                      {humanize(col)}
                      <Icon className={`h-3 w-3 ${active ? '' : 'opacity-0 group-hover:opacity-70'}`} />
                    </button>
                  ) : humanize(col)}
                </th>
              );
            })}
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={() => onOpenRow(row)}
              className="cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-gray-900/40"
            >
              {columns.map((col) => (
                <td key={col} className="max-w-[18rem] whitespace-nowrap px-4 py-3 text-gray-700 dark:text-gray-200">
                  {renderCell(col, row)}
                </td>
              ))}
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenRow(row)}
                    title={editable ? 'Open and edit' : 'View'}
                    className={ICON_BUTTON}
                  >
                    {editable ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  {editable && onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      title="Delete"
                      className={`${ICON_BUTTON} hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-400`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
