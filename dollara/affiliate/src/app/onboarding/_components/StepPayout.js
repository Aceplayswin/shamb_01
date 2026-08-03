


// Step 2 — Payout Method
// Three-tab toggle: UPI, Crypto, or Bank Wire.
// Shows different conditional input fields depending on the selection.





import { ArrowLeft, ArrowRight } from 'lucide-react';
import { inputClasses, labelClasses, primaryBtn, ghostBtn } from './tokens';



export default function StepPayout({ method, setMethod, details, updateDetail, onNext, onBack }) {
  return (
    <div className="animate-fade-up space-y-6">




      {/* Method toggle */}
      <div>
        <label className={labelClasses}>Select Payout Method</label>
        <div className="grid grid-cols-3 gap-2">
          {['UPI', 'Crypto', 'Bank'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                method === m
                  ? 'bg-brand-500/10 border-brand-500 text-brand-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {m === 'UPI'    && '🏦 UPI'}
              {m === 'Crypto' && '💎 Crypto'}
              {m === 'Bank'   && '🏛 Bank Wire'}
            </button>
          ))}
        </div>
      </div>



      {/* UPI fields */}
      {method === 'UPI' && (
        <div>
          <label className={labelClasses}>UPI ID</label>
          <input
            type="text"
            placeholder="yourname@upi"
            value={details.upiId}
            onChange={(e) => updateDetail('upiId', e.target.value)}
            className={inputClasses}
          />
          <p className="text-[10px] text-slate-400 mt-1.5">
            Payments sent every Monday to this UPI handle.
          </p>
        </div>
      )}




      {/* Crypto fields */}
      {method === 'Crypto' && (
        <div>
          <label className={labelClasses}>USDT Address (TRC-20)</label>
          <input
            type="text"
            placeholder="TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={details.cryptoAddress}
            onChange={(e) => updateDetail('cryptoAddress', e.target.value)}
            className={inputClasses}
          />
          <p className="text-[10px] text-slate-400 mt-1.5">
            Only TRC-20 (TRON network) addresses are currently supported.
          </p>
        </div>
      )}





      {/* Bank Wire fields */}
      {method === 'Bank' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Account Holder Name</label>
              <input
                type="text"
                placeholder="Alex Morgan"
                value={details.accountName}
                onChange={(e) => updateDetail('accountName', e.target.value)}
                className={inputClasses}
              />
            </div>


            <div>
              <label className={labelClasses}>Bank Name</label>
              <input
                type="text"
                placeholder="HDFC Bank"
                value={details.bankName}
                onChange={(e) => updateDetail('bankName', e.target.value)}
                className={inputClasses}
              />
            </div>


          </div>


          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Account Number</label>
              <input
                type="text"
                placeholder="XXXXXXXXXXXX"
                value={details.accountNumber}
                onChange={(e) => updateDetail('accountNumber', e.target.value)}
                className={inputClasses}
              />
            </div>


            <div>
              <label className={labelClasses}>IFSC / SWIFT Code</label>
              <input
                type="text"
                placeholder="HDFC0001234"
                value={details.ifswift}
                onChange={(e) => updateDetail('ifswift', e.target.value)}
                className={inputClasses}
              />
            </div>


          </div>
        </div>
      )}




      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={ghostBtn}>
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button type="button" onClick={onNext} className={primaryBtn}>
          <span>Save & Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>




  );
}
