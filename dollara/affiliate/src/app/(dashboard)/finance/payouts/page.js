'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Clock3, Wallet, CreditCard } from 'lucide-react';
import { useAffiliateData } from '../../../../hooks/useAffiliateData';
import { DataState } from '../../../../components/ui/DataState';
import { Pagination } from '../../../../components/ui/Pagination';
import { fmtDateShort, inr, label } from '../../../../lib/format';
import { toast } from '../../../../lib/toast';
import RequestPayoutModal from './_components/RequestPayoutModal';
import ManageMethodsModal from './_components/ManageMethodsModal';

const PAGE_SIZE = 20;

const STATUS_BADGES = {
  requested: 'bg-slate-50 dark:bg-slate-950/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800',
  approved:  'bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/30',
  paid:      'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30',
  rejected:  'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30',
};

const STATUS_LABELS = {
  requested: 'requested',
  approved:  'approved',
  paid:      'paid',
  rejected:  'rejected',
};

export default function PayoutsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showManageMethods, setShowManageMethods] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (statusFilter !== 'all') params.set('status', statusFilter);
    return params.toString();
  }, [statusFilter, page]);

  const { data, loading, error, reload } = useAffiliateData(
    `/api/v1/affiliate/payouts?${query}`,
    [query],
  );

  const balance = data?.balance;
  const methods = data?.methods ?? [];
  const history = data?.records ?? [];
  const total = data?.total ?? 0;

  // The server decides eligibility — it knows the threshold, whether a request
  // is already open, and whether a payout method exists. Recomputing that here
  // would be a second source of truth that can disagree with the one enforced.
  const canRequestPayout = Boolean(balance?.can_request);

  // Request ID / method search stays client-side: the page is already small and
  // the API's payout list has no text index worth hitting for it.
  const filteredHistory = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return history;
    return history.filter(
      (item) =>
        String(item.id).includes(needle)
        || (item.method_label || '').toLowerCase().includes(needle),
    );
  }, [history, search]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const handleRequested = () => {
    setShowRequestModal(false);
    reload();
    toast.success('Payout requested — the finance team will review it shortly.');
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">
            Payouts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Request commission withdrawals, manage payout accounts, and review payout status history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRequestModal(true)}
          disabled={!canRequestPayout}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${
            canRequestPayout
              ? 'bg-gradient-to-r from-brand-400 to-brand-600 text-black hover:shadow-md hover:brightness-105'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Plus className="w-4 h-4" /> Request Payout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card is dark in both themes, so the text is explicitly light. It
            previously used a near-black panel with slate-900 text, which made
            the balance invisible in light mode. */}
        <div className="rounded-3xl bg-slate-950/95 border border-slate-800/80 p-5 shadow-sm shadow-slate-950/50">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                Available balance
              </span>
              <p className="mt-3 text-3xl font-black font-display text-white">
                {inr(balance?.available ?? 0)}
              </p>
              {balance?.pending > 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  {inr(balance.pending)} still pending approval
                </p>
              )}
            </div>
            <Wallet className="w-7 h-7 text-brand-400" />
          </div>
          <p className="text-xs text-slate-400">
            Minimum payout threshold:{' '}
            <span className="font-semibold text-slate-100">
              {inr(balance?.minimum_threshold ?? 0)}
            </span>.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Next automatic payout window:{' '}
            <span className="font-semibold text-slate-100">
              {fmtDateShort(balance?.next_cycle_at)}
            </span>.
          </p>

          {balance && !canRequestPayout && (
            <div className="mt-4 rounded-2xl bg-rose-950/40 border border-rose-900/40 p-3 text-sm text-rose-200">
              {/* Says which condition is actually blocking, rather than always
                  blaming the balance. */}
              {balance.has_open_request
                ? 'You already have a payout in progress. It has to complete before you can request another.'
                : methods.length === 0
                  ? 'Add a payout method before you can withdraw.'
                  : 'Your approved balance is below the minimum payout threshold.'}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 gap-4">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Payout methods
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage your bank, UPI, and crypto withdrawal destinations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageMethods(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <CreditCard className="w-4 h-4" /> Manage Methods
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {methods.length === 0 && (
                <p className="col-span-full rounded-2xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
                  No payout methods yet. Add one before requesting a withdrawal.
                </p>
              )}
              {methods.map((method) => (
                <div
                  key={method.id}
                  className={`rounded-3xl border p-4 transition-colors ${method.is_primary ? 'border-brand-400/30 bg-brand-50/50 dark:bg-brand-950/20' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                        {method.method_type.toUpperCase()}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {method.label || label(method.method_type)}
                      </p>
                    </div>
                    {method.is_primary && (
                      <span className="rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 text-[10px] font-bold px-2 py-1">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{method.masked_details}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Clock3 className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Payout timing & rules</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Requests below the threshold are held until the next eligible payout cycle.</p>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-400">
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/30 p-3">Payout review typically completes within 48 hours.</div>
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/30 p-3">Approved payouts are processed via your selected primary method.</div>
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/30 p-3">Rejected requests will include a note to update your payout details.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-black font-display text-slate-900 dark:text-slate-100">Payout request history</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Review all past payout requests with status and processing dates.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by request ID or method"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            >
              <option value="all">All statuses</option>
              <option value="requested">Requested</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!filteredHistory.length}
          emptyTitle="No payout requests yet"
          emptyHint="Once your approved balance clears the threshold you can request a withdrawal."
          emptyIcon={Wallet}
        >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/40 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Request ID</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Method</th>
                <th className="p-4">Requested</th>
                <th className="p-4">Processed</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredHistory.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-slate-400 dark:text-slate-500">#{entry.id}</td>
                  <td className="p-4 font-black font-display text-slate-900 dark:text-slate-100">{inr(entry.amount)}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 font-semibold">
                    {entry.method_label}
                    {entry.reference && (
                      <span className="block text-[10px] font-normal text-slate-400">
                        Ref: {entry.reference}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">{fmtDateShort(entry.requested_at)}</td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">
                    {entry.processed_at ? fmtDateShort(entry.processed_at) : '—'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${STATUS_BADGES[entry.status] || STATUS_BADGES.requested}`}>
                      {STATUS_LABELS[entry.status] || entry.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">
                    No payout requests match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          total={total}
          perPage={PAGE_SIZE}
          onPage={setPage}
          noun="request"
        />
        </DataState>
      </div>

      {showRequestModal && (
        <RequestPayoutModal
          methods={methods}
          balance={balance?.available ?? 0}
          minimumThreshold={balance?.minimum_threshold ?? 0}
          onClose={() => setShowRequestModal(false)}
          onRequested={handleRequested}
        />
      )}

      {showManageMethods && (
        <ManageMethodsModal
          methods={methods}
          onClose={() => setShowManageMethods(false)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
