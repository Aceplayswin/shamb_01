'use client';

/**
 * Shared scaffold for the reference report screens.
 *
 * The finance reports all render the same way — filters, a headline total, an
 * evolution chart, then breakdown blocks — so they differ only in the slug
 * they read and which breakdowns they show.
 */

import { useMemo, useState } from 'react';
import { AdminShell, Card, inr } from '@/components/admin/AdminShell';
import {
  BreakdownTable,
  EvolutionChart,
  ExportButton,
  FilterPanel,
  ResultTable,
  TotalBanner,
  useBackofficeData,
} from '@/components/admin/Backoffice';

export const PERIOD_FIELDS = [
  { name: 'dateFrom', label: 'Period from', type: 'date' },
  { name: 'dateTo', label: 'Period to', type: 'date' },
];

export const CURRENCY_FIELD = {
  name: 'currency',
  label: 'Currency',
  type: 'select',
  options: [
    { value: '', label: 'Select Currency' },
    { value: 'INR', label: 'INR' },
    { value: 'USD', label: 'USD' },
  ],
};

export const COUNTRY_FIELD = { name: 'country', label: 'Country' };

/**
 * @param slug        report slug on /admin/bo/reports/<slug>
 * @param totals      [{label, value(data), tone}] headline figures
 * @param breakdowns  [{title, key}] sections rendered as name/amount/%
 * @param columns     when set, the report also renders a row table
 */
export default function ReportPage({
  title,
  subtitle,
  slug,
  fields = PERIOD_FIELDS,
  totals = [],
  breakdowns = [],
  chart,
  columns,
  tableTitle,
  exportable = true,
  pageSize = 25,
}) {
  const blank = useMemo(
    () => fields.reduce((a, f) => ({ ...a, [f.name]: '' }), {}),
    // Field lists are static per report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [draft, setDraft] = useState(blank);
  const [applied, setApplied] = useState(blank);
  const [page, setPage] = useState(0);

  const { data, loading, error, reload } = useBackofficeData(
    `/api/v1/admin/bo/reports/${slug}`,
    applied,
    { page, pageSize },
  );

  return (
    <AdminShell
      title={title}
      subtitle={subtitle}
      actions={exportable ? <ExportButton slug={slug} filters={applied} /> : null}
    >
      <div className="space-y-5">
        <FilterPanel
          fields={fields}
          values={draft}
          onChange={(name, value) => setDraft((d) => ({ ...d, [name]: value }))}
          onSearch={() => {
            setPage(0);
            setApplied(draft);
          }}
          onClear={() => {
            setDraft(blank);
            setApplied(blank);
            setPage(0);
          }}
          busy={loading}
        />

        {/* Reports that cannot compute say why, rather than showing bare zeros. */}
        {data?.note && (
          <Card className="border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-300">{data.note}</p>
          </Card>
        )}

        {totals.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {totals.map((t) => (
              <TotalBanner
                key={t.label}
                label={t.label}
                value={t.value(data)}
                tone={t.tone?.(data)}
              />
            ))}
          </div>
        )}

        {chart && data?.[chart.key]?.length > 0 && (
          <EvolutionChart
            title={chart.title}
            series={data[chart.key]}
            valueKey={chart.valueKey ?? 'amount'}
            money={chart.money !== false}
          />
        )}

        {breakdowns.map((b) => (
          <BreakdownTable
            key={b.key}
            title={b.title}
            // Some reports are a single breakdown and return {rows,total} at
            // the top level rather than under a named key; 'self' reads those.
            data={b.key === 'self' ? data : data?.[b.key]}
            money={b.money !== false}
          />
        ))}

        {columns && (
          <ResultTable
            title={tableTitle ?? title}
            columns={columns}
            rows={data?.rows}
            loading={loading}
            error={error}
            onRetry={reload}
            total={data?.total ?? 0}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        )}
      </div>
    </AdminShell>
  );
}
