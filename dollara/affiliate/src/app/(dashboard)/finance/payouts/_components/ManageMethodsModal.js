'use client';

import { useState } from 'react';
import { X, Plus, CheckCircle, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { affiliateApi } from '../../../../../services/affiliateApi';
import { confirmDialog, toast } from '../../../../../lib/toast';
import { label as humanize } from '../../../../../lib/format';

/**
 * Add, remove and re-prioritise payout destinations.
 *
 * Every action writes through to the API and then asks the page to refetch.
 * The previous version copied `methods` into local state, so adding or removing
 * one looked like it worked and silently reverted the moment the modal closed —
 * the page was still rendering the original array.
 *
 * Details are collected as structured fields per type rather than one free-text
 * box, because the server masks them for display and cannot mask a string it
 * does not understand the shape of.
 */

const FIELDS = {
  bank: [
    { key: 'accountName', label: 'Account holder', placeholder: 'As printed on the account' },
    { key: 'bankName', label: 'Bank', placeholder: 'e.g. ICICI Bank' },
    { key: 'accountNumber', label: 'Account number', placeholder: '••••••••1234' },
    { key: 'ifsc', label: 'IFSC / SWIFT', placeholder: 'e.g. ICIC0001234' },
  ],
  upi: [{ key: 'upiId', label: 'UPI ID', placeholder: 'name@bank' }],
  crypto: [
    { key: 'network', label: 'Network', placeholder: 'e.g. TRC20' },
    { key: 'address', label: 'Wallet address', placeholder: 'Your receiving address' },
  ],
};

export default function ManageMethodsModal({ methods, onClose, onChanged }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState('bank');
  const [label, setLabel] = useState('');
  const [details, setDetails] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fields = FIELDS[type] ?? [];
  const complete = fields.every((f) => (details[f.key] || '').trim());

  const resetForm = () => {
    setType('bank');
    setLabel('');
    setDetails({});
    setError('');
    setShowAddForm(false);
  };

  const handleAddMethod = async () => {
    if (!complete || saving) return;
    setSaving(true);
    setError('');
    try {
      await affiliateApi('/api/v1/affiliate/payout-methods', {
        method: 'POST',
        body: JSON.stringify({
          methodType: type,
          label: label.trim() || undefined,
          details,
        }),
      });
      toast.success('Payout method added');
      resetForm();
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Could not add that payout method.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (method) => {
    if (method.is_primary) return;
    setBusyId(method.id);
    try {
      await affiliateApi(`/api/v1/affiliate/payout-methods/${method.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPrimary: true }),
      });
      toast.success('Primary payout method updated');
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (method) => {
    const ok = await confirmDialog({
      title: 'Remove this payout method?',
      text: 'Payouts already sent to it keep their record. You can add it again later.',
      confirmText: 'Remove',
      danger: true,
    });
    if (!ok) return;

    setBusyId(method.id);
    try {
      await affiliateApi(`/api/v1/affiliate/payout-methods/${method.id}`, {
        method: 'DELETE',
      });
      toast.success('Payout method removed');
      onChanged?.();
    } catch (err) {
      // The API refuses while a payout is in flight against this method.
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const inputCls = 'mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors';
  const labelCls = 'text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-fade-up dark:border-slate-800 dark:bg-slate-900">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black font-display text-slate-900 dark:text-slate-100">
              Manage Payout Methods
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Add, remove, or switch your default payout destination.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {methods.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
              No payout methods configured yet. Add one to start requesting payouts.
            </div>
          ) : (
            <div className="space-y-3">
              {methods.map((method) => (
                <div
                  key={method.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30"
                >
                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                        {method.method_type.toUpperCase()}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {method.label || humanize(method.method_type)}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {method.masked_details}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(method)}
                        disabled={busyId === method.id}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
                          method.is_primary
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300'
                            : 'border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {busyId === method.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        {method.is_primary ? 'Primary' : 'Set primary'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemove(method)}
                        disabled={busyId === method.id}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:border-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAddForm ? (
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="block">
                  <span className={labelCls}>Type</span>
                  <select
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value);
                      // Fields differ per type, so stale values must not carry over.
                      setDetails({});
                    }}
                    className={inputCls}
                  >
                    <option value="bank">Bank</option>
                    <option value="upi">UPI</option>
                    <option value="crypto">Crypto</option>
                  </select>
                </label>

                <label className="block md:col-span-2">
                  <span className={labelCls}>Label (optional)</span>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Business account"
                    className={inputCls}
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {fields.map((field) => (
                  <label key={field.key} className="block">
                    <span className={labelCls}>{field.label}</span>
                    <input
                      value={details[field.key] || ''}
                      onChange={(e) =>
                        setDetails((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                      className={inputCls}
                    />
                  </label>
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-danger-400/40 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-600">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleAddMethod}
                  disabled={!complete || saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-3 text-sm font-bold text-black shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add payout method
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-3 text-sm font-bold text-black shadow-sm transition-all hover:shadow-md"
            >
              <Plus className="h-4 w-4" /> Add new payout method
            </button>
          )}
        </div>

        <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          Your primary payout method is used for all new payout requests. Account
          numbers are stored encrypted and only ever shown masked.
        </div>
      </div>
    </div>
  );
}
