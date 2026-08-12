// Step 1 — Terms & Conditions
// Displays the scrollable agreement text and a checkbox.
// "Accept & Continue" is disabled until the checkbox is ticked.




import { ArrowRight } from 'lucide-react';
import { primaryBtn } from './tokens';



const TERMS = [
  ['Partnership Terms', "By joining the Dollara Affiliate Program, you agree to promote Dollara's iGaming platform in compliance with all applicable laws and regulations in your jurisdiction."],
  ['Commission Structure', 'Commissions are calculated on net gaming revenue (NGR) after deduction of bonuses, chargebacks, and processing fees. Rates are as agreed in your partner contract.'],
  ['No Negative Carryover', 'Negative balances from one period will not carry over to the next. Each commission period starts fresh.'],
  ['Cookie Window', 'Attribution is based on a 30-day last-click cookie. Players must register within 30 days of clicking your tracking link to be attributed to your account.'],
  ['Prohibited Promotions', 'Self-referrals, spam, incentivised traffic, and promotions targeting minors are strictly prohibited and will result in immediate account suspension and commission forfeiture.'],
  ['Payment Schedule', 'Commissions are paid weekly every Monday, subject to a minimum threshold of $100 (or equivalent). Payouts below the threshold roll forward.'],
  ['KYC Requirement', 'Identity verification is required before any payout can be processed. Failure to complete KYC within 30 days will suspend commission accrual.'],
  ['Termination', 'Either party may terminate this agreement with 14 days written notice. Any earned commissions to the termination date remain payable.'],
];





export default function StepTerms({ agreed, setAgreed, onNext, loading }) {
  return (
    <div className="animate-fade-up space-y-6">



      {/* Scrollable terms box */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">

        <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex items-center space-x-2">

          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">

            Dollara Affiliate Agreement

          </span>

        </div>
        <div className="p-5 max-h-52 overflow-y-auto text-xs text-slate-600 space-y-3 leading-relaxed">
          {TERMS.map(([title, body], i) => (

            <p key={i}>
              <strong>{i + 1}. {title}.</strong> {body}
            </p>

        
          )
         )
        }

        </div>

      </div>



      {/* Agree checkbox */}
      <label className="flex items-start space-x-3 cursor-pointer group">
        <input
          type="checkbox"
          id="agree-terms"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
        />


        <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
          I have read and agree to the{' '}

          <span className="font-semibold text-slate-900">Dollara Affiliate Agreement</span>,

          including the payout schedule, cookie policy, and prohibited traffic clauses.
        </span>

      </label>




      <div className="flex gap-3">
        <button
          type="button"
          disabled={!agreed || loading}
          onClick={onNext}
          className={primaryBtn}
        >
          <span>Accept & Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
