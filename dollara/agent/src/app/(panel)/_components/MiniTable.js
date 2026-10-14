import { DataState } from '../../../components/ui/DataState';

/**
 * The dashboard's small ranked tables (Top 5 / Top 10 blocks).
 *
 * `columns` is `[{ key, label, align, render }]`. They all share one component
 * because the panel shows seven of them and they differ only in their headers.
 */
export default function MiniTable({ columns, rows, loading, error, onRetry }) {
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead>
          <tr>
            {columns.map(({ key, label, align }) => (
              <th key={key} className={align === 'right' ? 'text-right' : undefined}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <DataState
            loading={loading}
            error={error}
            empty={!rows?.length}
            onRetry={onRetry}
            colSpan={columns.length}
            skeleton={
              <tr>
                <td colSpan={columns.length} className="!p-0">
                  <div className="h-24 animate-pulse bg-panel-head/50" />
                </td>
              </tr>
            }
          >
            {rows?.map((row, index) => (
              <tr key={row.id ?? row.userId ?? row.marketId ?? index}>
                {columns.map(({ key, align, render }) => (
                  <td
                    key={key}
                    className={align === 'right' ? 'num' : undefined}
                  >
                    {render ? render(row) : row[key]}
                  </td>
                ))}
              </tr>
            ))}
          </DataState>
        </tbody>
      </table>
    </div>
  );
}
