'use client';

import { useState } from 'react';
import { mockSupportTickets } from '../../../lib/mockData';


export default function SupportPage() {
  const [tickets, setTickets] = useState(mockSupportTickets);
  const [form, setForm] = useState({
    subject: '',
    message: '',
    priority: 'normal',
  });

  // create a new ticket and stick it at the top of the list
  const submitTicket = (e) => {
    e.preventDefault();

    const id = `T-${Date.now().toString().slice(-6)}`;

    const newTicket = {
      id,
      subject: form.subject,
      message: form.message,
      status: 'open',
      createdAt: new Date().toISOString().slice(0, 10),
      source: 'affiliate',
      priority: form.priority,
    };

    setTickets((prev) => [newTicket, ...prev]);

    // clear the form
    setForm({ subject: '', message: '', priority: 'normal' });
  };


  return (
    <div className="space-y-6 animate-fade-up">

      {/* page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-slate-900 dark:text-slate-100">
            Support
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ticket list and new ticket submission (mock).
          </p>
        </div>
      </div>


      <div className="grid gap-4 lg:grid-cols-3">

        {/* new ticket form */}
        <section className="lg:col-span-2 rounded-3xl bg-white dark:bg-slate-900 border p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase text-slate-500">
            New ticket
          </h2>

          <form onSubmit={submitTicket} className="mt-3 space-y-3">
            <input
              placeholder="Subject"
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />

            <textarea
              placeholder="Message"
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              rows={6}
            />

            <div className="flex items-center gap-2">
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 text-black font-semibold"
              >
                Create ticket
              </button>
            </div>
          </form>
        </section>


        {/* recent tickets list */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase text-slate-500">
            Recent tickets
          </h2>

          <div className="mt-3 divide-y">
            {tickets.map((t) => (
              <div key={t.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{t.subject}</div>
                    <div className="text-xs text-slate-500">
                      {t.createdAt} • {t.status}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {t.priority ?? 'normal'}
                  </div>
                </div>

                <div className="mt-2 text-sm text-slate-600">
                  {t.message}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

    </div>
  );
}