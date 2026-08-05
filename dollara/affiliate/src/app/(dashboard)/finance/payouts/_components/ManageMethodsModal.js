'use client';

import { useState } from 'react';
import { X, Plus, CheckCircle, Trash2, ChevronRight } from 'lucide-react';



export default function ManageMethodsModal({ methods, onClose }) {
  const [items, setItems] = useState(methods);
  const [activeId, setActiveId] = useState(items.find((item) => item.isPrimary)?.id || items[0]?.id);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMethod, setNewMethod] = useState({ type: 'bank', label: '', details: '' });

  const handleSetPrimary = (id) => setActiveId(id);
  const handleRemove = (id) => setItems((prev) => prev.filter((method) => method.id !== id));
  const handleAddMethod = () => {
    if (!newMethod.label.trim() || !newMethod.details.trim()) return;
    const nextId = `${newMethod.type}-${Date.now()}`;
    setItems((prev) => [
      ...prev,
      { id: nextId, type: newMethod.type, label: newMethod.label.trim(), details: newMethod.details.trim(), isPrimary: false },
    ]);
    setNewMethod({ type: 'bank', label: '', details: '' });
    setShowAddForm(false);
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">


      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-fade-up">


        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black font-display text-slate-900 dark:text-slate-100">Manage Payout Methods</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Add, remove, or switch your default payout destination.</p>
          </div>


          <button onClick={onClose}
           className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>





        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-600 dark:text-slate-400">

              No payout methods configured yet. Add one to start requesting payouts.

            </div>



          ) : (
            <div className="space-y-3">


              {items.map((method) => (
                <div key={method.id} className="rounded-3xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">{method.type.toUpperCase()}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{method.label}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{method.details}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(method.id)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all ${
                          activeId === method.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {activeId === method.id ? 'Primary' : 'Set primary'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(method.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 dark:border-slate-800 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        
                         Remove
                         
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}





          {showAddForm ? (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</span>
                  <select
                    value={newMethod.type}
                    onChange={(e) => setNewMethod((prev) => ({ ...prev, type: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
                  >
                    <option value="bank">Bank</option>
                    <option value="upi">UPI</option>
                    <option value="crypto">Crypto</option>
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Label</span>
                  <input
                    value={newMethod.label}
                    onChange={(e) => setNewMethod((prev) => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g. ICICI Bank, UPI, USDT Wallet"
                    className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Details</span>
                <input
                  value={newMethod.details}
                  onChange={(e) => setNewMethod((prev) => ({ ...prev, details: e.target.value }))}
                  placeholder="e.g. ICICI • ****1234 or dollara@upi or TRC20 wallet address"
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
                />
              </label>
              <div className="flex flex-col gap-3 sm:flex-row items-stretch sm:items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddMethod}
                  disabled={!newMethod.label.trim() || !newMethod.details.trim()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-400 to-brand-600 text-black px-4 py-3 text-sm font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" /> Add payout method
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-300 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-400 to-brand-600 text-black px-4 py-3 text-sm font-bold shadow-sm hover:shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> Add new payout method
            </button>
          )}
        </div>

        <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          Tip: Your primary payout method is used for all new payout requests.
        </div>
      </div>
    </div>
  );
}
