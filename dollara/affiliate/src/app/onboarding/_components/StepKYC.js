// Step 3 — KYC Document Upload
// Drag-and-drop file zone with visual feedback.
// dragOver state is local here — no need to lift it to page.js.

'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, UploadCloud, Check } from 'lucide-react';
import { inputClasses, labelClasses, primaryBtn, ghostBtn } from './tokens';

const DOC_TYPES = [
  { value: 'Passport',       label: 'Passport' },
  { value: 'NationalID',     label: 'National ID Card' },
  { value: 'DriverLicense',  label: "Driver's License" },
  { value: 'UtilityBill',    label: 'Utility Bill (Proof of Address)' },
];

export default function StepKYC({ docType, setDocType, docFile, setDocFile, onNext, onBack, loading }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setDocFile(file);
  };

  return (
    <div className="animate-fade-up space-y-6">

      {/* Document type selector */}
      <div>
        <label className={labelClasses}>Document Type</label>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className={inputClasses}
        >
          {DOC_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Drag-and-drop file zone */}
      <div>
        <label className={labelClasses}>Upload Document</label>
        <label
          htmlFor="kyc-upload"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-3 py-10 px-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            dragOver
              ? 'border-brand-500 bg-brand-500/5'
              : docFile
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
          }`}
        >
          {docFile ? (
            <>
              <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Check className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">{docFile.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {(docFile.size / 1024).toFixed(1)} KB · Click to replace
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">
                  Drag & drop or <span className="text-brand-600">browse files</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">JPG, PNG or PDF · Max 5 MB</p>
              </div>
            </>
          )}
          <input
            id="kyc-upload"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={(e) => setDocFile(e.target.files[0] || null)}
          />
        </label>

        <p className="text-[10px] text-slate-400 mt-2">
          Your document is encrypted and reviewed only by our compliance team. Never shared with third parties.
        </p>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={ghostBtn}>
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button type="button" onClick={onNext} disabled={loading} className={primaryBtn}>
          <span>Submit & Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
