'use client';

import { DataState } from '../../../components/ui/DataState';
import { Pagination } from '../../../components/ui/Pagination';

/**
 * The flat table behind the five list-style reports (bet list, transfers,
 * settlements, transactions, real revenue).
 *
 * `columns` is `[{ key, label, align, render }]`; `footer` is an array of
 * `[label, value]`-shaped cells rendered as one summary row. The three P&L
 * reports use PlTable instead — their grouped two-row header is different
 * enough that folding both into one component would need a config language.
 */
export default function SimpleTable({
  columns,
  data,
  loading,
  error,
  onRetry,
  page,
  setPage,
  perPage,
  noun = 'row',
  footer,
}) {
  const rows = data?.rows ?? [];

  return (
    <>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
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
              onRetry={onRetry}
              colSpan={columns.length}
              skeleton={
                <tr>
                  <td colSpan={columns.length} className="!p-0">
                    <div className="h-28 animate-pulse bg-panel-head/50" />
                  </td>
                </tr>
              }
            >
              {rows.map((row, index) => (
                <tr key={row.id ?? row.agentId ?? index}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={column.align === 'right' ? 'num' : undefined}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </DataState>
          </tbody>

          {footer && (
            <tfoot>
              <tr className="font-semibold">{footer}</tr>
            </tfoot>
          )}
        </table>
      </div>

      {setPage && (
        <Pagination
          page={page}
          total={data?.total ?? 0}
          perPage={perPage}
          onPage={setPage}
          noun={noun}
        />
      )}
    </>
  );
}
