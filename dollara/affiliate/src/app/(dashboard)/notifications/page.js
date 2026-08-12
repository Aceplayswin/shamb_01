'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { affiliateApi } from '../../../services/affiliateApi';
import { useAffiliate } from '../../../context/AffiliateContext';
import { useAffiliateData } from '../../../hooks/useAffiliateData';
import { DataState } from '../../../components/ui/DataState';
import { confirmDialog, toast } from '../../../lib/toast';
import { fmtDate, relativeTime } from '../../../lib/format';

export default function NotificationsPage() {
  // refreshUnread keeps the sidebar and header badges honest. Before this the
  // page mutated a local array, so marking everything read here left the
  // sidebar still showing a count.
  const { refreshUnread } = useAffiliate();
  const { data, loading, error, reload } = useAffiliateData(
    '/api/v1/affiliate/notifications?limit=50',
    [],
  );
  const [busyId, setBusyId] = useState(null);

  const items = data?.records ?? [];
  const unreadCount = data?.unread ?? 0;

  const setRead = async (id, isRead) => {
    setBusyId(id);
    try {
      await affiliateApi(`/api/v1/affiliate/notifications/${id}/read`, {
        method: 'POST',
        body: JSON.stringify({ isRead }),
      });
      reload();
      refreshUnread();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    try {
      await affiliateApi('/api/v1/affiliate/notifications/read-all', { method: 'POST' });
      reload();
      refreshUnread();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const clearAll = async () => {
    const ok = await confirmDialog({
      title: 'Clear all notifications?',
      text: 'This removes them permanently. Your referrals, commission and payouts are unaffected.',
      confirmText: 'Clear all',
      danger: true,
    });
    if (!ok) return;

    try {
      await affiliateApi('/api/v1/affiliate/notifications/clear', { method: 'DELETE' });
      toast.success('Notifications cleared');
      reload();
      refreshUnread();
    } catch (err) {
      toast.error(err.message);
    }
  };


  return (
    <div className="space-y-6 animate-fade-up">

      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            In-app feed: new referrals, deposits, commission updates, payouts and key reminders.
          </p>
        </div>

        <div className="inline-flex items-center gap-2">
          <button
            onClick={markAllRead}
            disabled={!unreadCount}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/70 text-xs font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            Mark all read
          </button>

          <button
            onClick={clearAll}
            disabled={!items.length}
            className="px-3 py-2 rounded-xl border border-rose-300 bg-rose-50 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-all"
          >
            Clear all
          </button>
        </div>
      </div>


      {/* main list */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Activity
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Latest system notifications
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Unread:{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {unreadCount}
            </span>
          </div>
        </div>

        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          empty={!items.length}
          emptyTitle="Nothing to catch up on"
          emptyHint="New referrals, deposits, commission runs and payout updates land here."
          emptyIcon={Bell}
        >
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 ${
                n.is_read ? 'bg-transparent' : 'bg-slate-50 dark:bg-slate-950/40'
              } rounded-xl`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {n.title}
                  </div>
                  <div className="text-xs text-slate-400" title={fmtDate(n.created_at)}>
                    {relativeTime(n.created_at)}
                  </div>
                </div>

                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {n.message}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-col items-end gap-2">
                  {!n.is_read ? (
                    <button
                      type="button"
                      onClick={() => setRead(n.id, true)}
                      disabled={busyId === n.id}
                      className="text-xs font-semibold text-brand-600 disabled:opacity-50"
                    >
                      Mark read
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRead(n.id, false)}
                      disabled={busyId === n.id}
                      className="text-xs text-slate-500 disabled:opacity-50"
                    >
                      Mark unread
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        </DataState>
      </div>

    </div>
  );
}