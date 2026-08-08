'use client';

import { useState, useMemo } from 'react';
import { Bell, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { mockNotifications } from '../../../lib/mockData';


export default function NotificationsPage() {
  const [items, setItems] = useState(mockNotifications);

  // just count how many are still unread
  const unreadCount = useMemo(
    () => items.filter((i) => !i.read).length,
    [items]
  );

  const markRead = (id) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, read: true } : it))
    );
  };

  const markUnread = (id) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, read: false } : it))
    );
  };

  const markAllRead = () => {
    setItems((prev) => prev.map((it) => ({ ...it, read: true })));
  };

  const clearAll = () => {
    setItems([]);
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
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/70 text-xs font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-200 transition-all"
          >
            Mark all read
          </button>

          <button
            onClick={clearAll}
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

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">
              No notifications.
            </div>
          )}

          {items.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 ${
                n.read ? 'bg-transparent' : 'bg-slate-50 dark:bg-slate-950/40'
              } rounded-xl`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {n.title}
                  </div>
                  <div className="text-xs text-slate-400">{n.time}</div>
                </div>

                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {n.message}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-col items-end gap-2">
                  {!n.read ? (
                    <button
                      onClick={() => markRead(n.id)}
                      className="text-xs text-brand-600 font-semibold"
                    >
                      Mark read
                    </button>
                  ) : (
                    <button
                      onClick={() => markUnread(n.id)}
                      className="text-xs text-slate-500"
                    >
                      Mark unread
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}