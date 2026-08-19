'use client';

import { useCallback, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import Card from './Card';
import CreditSummary from './CreditSummary';
import DateRangeField from './DateRangeField';
import { useAgent } from '../../../context/AgentContext';
import { useAgentData } from '../../../hooks/useAgentData';
import { agentDownload } from '../../../services/agentApi';
import { toast } from '../../../lib/toast';

/**
 * The frame all eight report screens share: credit strip, filter bar, and a
 * results card with the export button.
 *
 * Two pieces of state that look alike are deliberately kept apart:
 *
 *   `draft`   — what is currently typed into the filter bar;
 *   `applied` — what the last Search actually queried.
 *
 * Only `applied` is in the fetch key, so typing a date does not fire a query
 * per keystroke, and the table on screen always matches the filters that
 * produced it rather than the ones being edited above it.
 *
 * `children` is a render function so each report owns its own table markup —
 * the columns differ too much between "by market" and "transactions" for one
 * generic table to serve both without a configuration language of its own.
 */
export default function ReportShell({
  kind,
  title,
  fields = [],
  paginated = false,
  perPage = 50,
  exportName,
  children,
}) {
  const { range, setRange } = useAgent();

  const blankFilters = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.name, ''])),
    [fields],
  );

  const [draft, setDraft] = useState({ ...blankFilters, ...range });
  const [applied, setApplied] = useState({ ...blankFilters, ...range });
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(applied).forEach(([key, value]) => {
      if (value !== '' && value != null) params.set(key, value);
    });
    if (paginated) {
      params.set('page', String(page));
      params.set('perPage', String(perPage));
    }
    return params.toString();
  }, [applied, page, paginated, perPage]);

  const { data, loading, error, reload } = useAgentData(
    `/api/v1/agent/reports/${kind}?${query}`,
    [query],
  );

  const search = useCallback(
    (event) => {
      event?.preventDefault();
      setApplied(draft);
      setPage(0);
      // The period the agent just searched carries to the next report screen,
      // which is almost always the same period.
      setRange({ from: draft.from, to: draft.to });
    },
    [draft, setRange],
  );

  const cancel = useCallback(() => {
    const reset = { ...blankFilters, from: range.from, to: range.to };
    setDraft(reset);
    setApplied(reset);
    setPage(0);
  }, [blankFilters, range.from, range.to]);

  const exportCsv = useCallback(async () => {
    setExporting(true);
    try {
      // The export deliberately sends `applied`, not `draft` — the file has to
      // be the table the agent is looking at.
      const params = new URLSearchParams();
      Object.entries(applied).forEach(([key, value]) => {
        if (value !== '' && value != null) params.set(key, value);
      });
      await agentDownload(
        `/api/v1/agent/reports/${kind}/export?${params.toString()}`,
        `${exportName ?? kind}-${applied.from}-to-${applied.to}.csv`,
      );
    } catch (e) {
      toast.error(e.message || 'Could not download the report');
    } finally {
      setExporting(false);
    }
  }, [applied, kind, exportName]);

  const setField = (name, value) => setDraft((d) => ({ ...d, [name]: value }));

  return (
    <div className="space-y-6 animate-fade-up">
      <CreditSummary summary={data?.summary} />

      <Card title={title}>
        <form onSubmit={search} className="rounded bg-panel-sunken p-5">
          <div className="max-w-md">
            <DateRangeField
              label="Period"
              from={draft.from}
              to={draft.to}
              onChange={(from, to) => setDraft((d) => ({ ...d, from, to }))}
            />
          </div>

          {fields.length > 0 && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {fields.map((field) => (
                <div key={field.name}>
                  <label className="field-label" htmlFor={`filter-${field.name}`}>
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      id={`filter-${field.name}`}
                      value={draft[field.name] ?? ''}
                      onChange={(e) => setField(field.name, e.target.value)}
                      className="field"
                    >
                      <option value="">All</option>
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`filter-${field.name}`}
                      type="text"
                      value={draft[field.name] ?? ''}
                      placeholder={field.placeholder}
                      onChange={(e) => setField(field.name, e.target.value)}
                      className="field"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" className="btn-primary">
              Search
            </button>
            <button type="button" onClick={cancel} className="btn-cancel">
              Cancel
            </button>
          </div>
        </form>
      </Card>

      <Card
        title={title}
        actions={
          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting || loading}
            className="btn-primary"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Preparing…' : 'Download Excel'}
          </button>
        }
      >
        {children({ data, loading, error, reload, page, setPage, perPage })}
      </Card>
    </div>
  );
}
