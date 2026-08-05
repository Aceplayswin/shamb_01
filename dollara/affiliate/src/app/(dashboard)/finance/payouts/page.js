'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Clock3, Wallet, CreditCard, Banknote, ArrowUpRight } from 'lucide-react';
import { mockPayoutInfo, mockPayoutMethods, mockPayoutHistory } from '../../../../lib/mockData';
import RequestPayoutModal from './_components/RequestPayoutModal';
import ManageMethodsModal from './_components/ManageMethodsModal';

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
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showManageMethods, setShowManageMethods] = useState(false);

  const canRequestPayout = mockPayoutInfo.availableBalance >= mockPayoutInfo.minimumThreshold;

  const filteredHistory = useMemo(() => {
    let items = mockPayoutHistory;
    if (statusFilter !== 'all') {
      items = items.filter((item) => item.status === statusFilter);
    }
    if (search.trim()) {
      items = items.filter((item) =>
        item.id.toLowerCase().includes(search.toLowerCase()) ||
        item.method.toLowerCase().includes(search.toLowerCase())
      );
    }
    return items;
  }, [search, statusFilter]);

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
        <div className="rounded-3xl bg-slate-950/95 border border-slate-800/80 p-5 shadow-sm shadow-slate-950/50">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
                Available balance
              </span>
              <p className="mt-3 text-3xl font-black font-display text-slate-900 dark:text-slate-100">
                ${mockPayoutInfo.availableBalance.toLocaleString()}
              </p>
            </div>
            <Wallet className="w-7 h-7 text-brand-600 dark:text-brand-400" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Minimum payout threshold: <span className="font-semibold text-slate-900 dark:text-slate-100">${mockPayoutInfo.minimumThreshold.toLocaleString()}</span>.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Next automatic payout window: <span className="font-semibold text-slate-900 dark:text-slate-100">{mockPayoutInfo.nextPayoutCycle}</span>.
          </p>
          {!canRequestPayout && (
            <div className="mt-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 p-3 text-sm text-rose-700 dark:text-rose-300">
              Your balance is below the minimum payout threshold. Keep earning to request a payout.
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
              {mockPayoutMethods.map((method) => (
                <div key={method.id} className={`rounded-3xl border p-4 transition-colors ${method.isPrimary ? 'border-brand-400/30 bg-brand-50/50 dark:bg-brand-950/20' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30'}`}>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                        {method.type.toUpperCase()}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{method.label}</p>
                    </div>
                    {method.isPrimary && (
                      <span className="rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 text-[10px] font-bold px-2 py-1">Primary</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{method.details}</p>
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
                  <td className="p-4 font-mono font-bold text-slate-400 dark:text-slate-500">{entry.id}</td>
                  <td className="p-4 font-black font-display text-slate-900 dark:text-slate-100">${entry.amount.toLocaleString()}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 font-semibold">{entry.method}</td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">{entry.requestedAt}</td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">{entry.processedAt}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${STATUS_BADGES[entry.status]}`}>
                      {STATUS_LABELS[entry.status]}
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
      </div>

      {showRequestModal && (
        <RequestPayoutModal
          methods={mockPayoutMethods}
          balance={mockPayoutInfo.availableBalance}
          minimumThreshold={mockPayoutInfo.minimumThreshold}
          onClose={() => setShowRequestModal(false)}
        />
      )}

      {showManageMethods && (
        <ManageMethodsModal
          methods={mockPayoutMethods}
          onClose={() => setShowManageMethods(false)}
        />
      )}
    </div>
  );
}
