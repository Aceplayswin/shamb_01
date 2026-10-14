'use client';

/**
 * Create Bonus — reference screen `/createbonus`.
 *
 * The reference is a seven-step wizard with a step list down the left. That
 * structure is kept because each step is a genuinely separate concern, but it
 * is rendered with the console's own theme rather than the reference's.
 *
 * Steps 1–4 and 6–7 write to `bonuses`; step 5 (Exclude Affiliates) and the
 * Coupon Sets copy are separate tables, so they are saved once the bonus row
 * exists and the wizard has an id to hang them off.
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  Toggle,
  toast,
  useAdminData,
} from '@/components/admin/AdminShell';

const STEPS = [
  'General',
  'Redemption',
  'Coupon Sets',
  'Abuse',
  'Exclude Affiliates',
  'Allowed Countries',
  'Wagering Conditions',
];

const EMPTY = {
  // General
  name: '',
  bonus_type: '',
  priority: '0',
  coupon_length: '',
  promo_code: '',
  is_published: true,
  is_public: true,
  // Old players. `is_new_player_only` is the exclude switch; `old_player_rule`
  // says who counts as old — registered before this bonus starts, or more
  // than `new_player_days` days ago. See bonus_services.old_player_cutoff.
  is_new_player_only: false,
  old_player_rule: 'since_start',
  new_player_days: '7',
  affiliate_id: '',
  parent_bonus_id: '',
  comment: '',
  // Redemption
  redemption_type: '',
  redemption_amount: '',
  max_redeemable_value: '',
  min_deposit: '',
  payment_methods: '',
  value_type: 'percentage',
  value_amount: '',
  // Coupon Sets
  language: 'en',
  display_title: '',
  description: '',
  image_url: '',
  terms_conditions: '',
  // Abuse
  abuse_similarity_percent: '',
  abuse_deposited_days: '',
  abuse_played_days: '',
  // Allowed countries
  allowed_countries: '',
  // Wagering
  wagering_multiplier: '35',
  credit_target: 'bonus',
  bonus_validity_days: '30',
  max_bonus_cap: '',
  per_user_limit: '',
  total_budget: '',
  // Claim conditions — blank = no requirement. Players see the offer with a
  // disabled Claim button until every one of these is met.
  claim_min_balance: '',
  claim_min_wagering: '',
  claim_min_deposit_total: '',
  status: 'draft',
  start_date: '',
  end_date: '',
};

// What the chosen old-player rule means for the player, shown under the picker.
const OLD_PLAYER_HINT = {
  include: 'Every registered player can take this bonus.',
  since_start:
    'Accounts opened before the Starts date (or before the bonus is created, when Starts is blank) see the offer but cannot claim it.',
  days: 'Accounts older than this many days at the time of claiming see the offer but cannot claim it.',
};

export default function CreateBonusPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [excluded, setExcluded] = useState([]);
  const [busy, setBusy] = useState(false);

  // Affiliate list drives both the General tab's Affiliate/Ad picker and the
  // Exclude Affiliates checkbox list.
  const { data: affiliates } = useAdminData('/api/v1/admin/affiliates?limit=200', []);
  const affiliateRows = Array.isArray(affiliates) ? affiliates : affiliates?.rows ?? [];

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setVal = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleAffiliate = (id) =>
    setExcluded((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  const num = (v) => (v === '' || v === null ? undefined : Number(v));

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      setStep(0);
      return;
    }
    if (
      form.is_new_player_only &&
      form.old_player_rule === 'days' &&
      !(num(form.new_player_days) >= 1)
    ) {
      toast.error('Days since registration must be at least 1');
      setStep(0);
      return;
    }
    setBusy(true);
    try {
      const created = await adminApi('/api/v1/admin/bonuses/create', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          display_title: form.display_title || undefined,
          description: form.description || undefined,
          bonus_type: form.bonus_type || 'manual',
          priority: num(form.priority),
          coupon_length: num(form.coupon_length),
          promo_code: form.promo_code || undefined,
          is_published: form.is_published,
          is_public: form.is_public,
          is_new_player_only: form.is_new_player_only,
          // 0 = "registered before this bonus starts"; N = "more than N days ago".
          new_player_days: form.old_player_rule === 'days' ? num(form.new_player_days) : 0,
          affiliate_id: num(form.affiliate_id),
          parent_bonus_id: num(form.parent_bonus_id),
          comment: form.comment || undefined,
          redemption_type: form.redemption_type || undefined,
          redemption_amount: num(form.redemption_amount),
          max_redeemable_value: num(form.max_redeemable_value),
          min_deposit: num(form.min_deposit),
          payment_methods: form.payment_methods || undefined,
          value_type: form.value_type,
          value_amount: num(form.value_amount) ?? 0,
          abuse_similarity_percent: num(form.abuse_similarity_percent),
          abuse_deposited_days: num(form.abuse_deposited_days),
          abuse_played_days: num(form.abuse_played_days),
          wagering_multiplier: num(form.wagering_multiplier),
          credit_target: form.credit_target,
          bonus_validity_days: num(form.bonus_validity_days),
          max_bonus_cap: num(form.max_bonus_cap),
          per_user_limit: num(form.per_user_limit),
          total_budget: num(form.total_budget),
          claim_min_balance: num(form.claim_min_balance),
          claim_min_wagering: num(form.claim_min_wagering),
          claim_min_deposit_total: num(form.claim_min_deposit_total),
          status: form.status,
          start_date: form.start_date || undefined,
          end_date: form.end_date || undefined,
        }),
      });

      const bonusId = created.id;

      // Sub-resources need the bonus to exist first, so they follow the create.
      if (excluded.length) {
        await adminApi(`/api/v1/admin/bo/bonuses/${bonusId}/excluded-affiliates`, {
          method: 'PUT',
          body: JSON.stringify({ affiliate_ids: excluded }),
        });
      }
      if (form.display_title.trim()) {
        await adminApi(`/api/v1/admin/bo/bonuses/${bonusId}/translations`, {
          method: 'POST',
          body: JSON.stringify({
            language: form.language,
            title: form.display_title,
            description: form.description,
            image_url: form.image_url,
            terms_conditions: form.terms_conditions,
          }),
        });
      }

      toast.success('Bonus created');
      router.push('/bonus/list');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const last = step === STEPS.length - 1;

  return (
    <AdminShell
      title="Create Bonus"
      subtitle={`Step ${step + 1} of ${STEPS.length} — ${STEPS[step]}`}
    >
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        {/* Step rail */}
        <Card className="h-fit overflow-hidden p-2">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                i === step
                  ? 'bg-indigo-600 font-semibold text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>
                <span className="block">{label}</span>
                <span className={`block text-[11px] ${i === step ? 'text-indigo-200' : 'text-slate-500'}`}>
                  Step {i + 1} of {STEPS.length}
                </span>
              </span>
              {i < step && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
            </button>
          ))}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name *">
                  <Input value={form.name} onChange={set('name')} required />
                </Field>
                <Field label="Type *">
                  <Select value={form.bonus_type} onChange={set('bonus_type')}>
                    <option value="">Select Type</option>
                    <option value="joining">Joining</option>
                    <option value="deposit">Deposit</option>
                    <option value="referral">Referral</option>
                    <option value="game">Game</option>
                    <option value="cashback">Cashback</option>
                    <option value="no_deposit">No deposit</option>
                    <option value="free_spins">Free spins</option>
                    <option value="loyalty">Loyalty</option>
                    <option value="reload">Reload</option>
                    <option value="manual">Manual</option>
                  </Select>
                </Field>
                <Field label="Priority">
                  <Input type="number" value={form.priority} onChange={set('priority')} />
                  <p className="mt-1 text-[11px] text-slate-500">
                    The priority over the other if the player can redeem more than
                    one bonus. 0 for accumulative bonus.
                  </p>
                </Field>
                <Field label="Coupon Length">
                  <Input
                    type="number"
                    value={form.coupon_length}
                    onChange={set('coupon_length')}
                  />
                </Field>
                <Field label="Coupon Code">
                  <Input value={form.promo_code} onChange={set('promo_code')} />
                </Field>
                <Field label="Affiliate/Ad">
                  <Select value={form.affiliate_id} onChange={set('affiliate_id')}>
                    <option value="">Select Affiliate</option>
                    {affiliateRows.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name ?? a.username ?? `Affiliate ${a.id}`}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Parent Coupon Code">
                  <Input
                    type="number"
                    placeholder="Parent bonus ID"
                    value={form.parent_bonus_id}
                    onChange={set('parent_bonus_id')}
                  />
                </Field>
                <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:gap-8">
                  <Toggle
                    checked={form.is_published}
                    onChange={(v) => setVal('is_published', v)}
                    label="Is Published"
                  />
                  <Toggle
                    checked={form.is_public}
                    onChange={(v) => setVal('is_public', v)}
                    label="Is Public"
                  />
                </div>
                <Field
                  label="Old Players"
                  className="sm:col-span-2"
                  hint={OLD_PLAYER_HINT[form.is_new_player_only ? form.old_player_rule : 'include']}
                >
                  <Select
                    value={form.is_new_player_only ? 'exclude' : 'include'}
                    onChange={(e) => setVal('is_new_player_only', e.target.value === 'exclude')}
                  >
                    <option value="include">Include old players</option>
                    <option value="exclude">Exclude old players</option>
                  </Select>
                </Field>
                {form.is_new_player_only && (
                  <Field label="Who Counts As Old">
                    <Select value={form.old_player_rule} onChange={set('old_player_rule')}>
                      <option value="since_start">Registered before this bonus starts</option>
                      <option value="days">Registered more than N days ago</option>
                    </Select>
                  </Field>
                )}
                {form.is_new_player_only && form.old_player_rule === 'days' && (
                  <Field label="Days Since Registration (N)">
                    <Input
                      type="number"
                      min="1"
                      value={form.new_player_days}
                      onChange={set('new_player_days')}
                    />
                  </Field>
                )}
                <Field label="Comment" className="sm:col-span-2">
                  <Textarea rows={3} value={form.comment} onChange={set('comment')} />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Redemption Type *">
                  <Select value={form.redemption_type} onChange={set('redemption_type')}>
                    <option value="">Select Redemption Type</option>
                    <option value="coupon">Coupon</option>
                    <option value="deposit">Deposit</option>
                    <option value="automatic">Automatic</option>
                    <option value="manual">Manual</option>
                  </Select>
                </Field>
                <Field label="Redemption Amount *">
                  <Input
                    type="number"
                    value={form.redemption_amount}
                    onChange={set('redemption_amount')}
                  />
                </Field>
                <Field label="Maximum Redeemable Value">
                  <Input
                    type="number"
                    value={form.max_redeemable_value}
                    onChange={set('max_redeemable_value')}
                  />
                </Field>
                <Field label="Minimum Deposit">
                  <Input
                    type="number"
                    value={form.min_deposit}
                    onChange={set('min_deposit')}
                  />
                </Field>
                <Field label="Payment Methods">
                  <Input
                    placeholder="upi,card — blank means any"
                    value={form.payment_methods}
                    onChange={set('payment_methods')}
                  />
                </Field>
                <Field label="Bonus Type *">
                  <Select value={form.value_type} onChange={set('value_type')}>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed</option>
                  </Select>
                </Field>
                <Field
                  label={form.value_type === 'percentage' ? 'Eligible Amount In Percent' : 'Amount (₹)'}
                >
                  <Input
                    type="number"
                    value={form.value_amount}
                    onChange={set('value_amount')}
                  />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Language">
                  <Select value={form.language} onChange={set('language')}>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                  </Select>
                </Field>
                <Field label="Title *" className="sm:col-span-2">
                  <Input value={form.display_title} onChange={set('display_title')} />
                </Field>
                <Field label="Description *" className="sm:col-span-2">
                  <Textarea rows={4} value={form.description} onChange={set('description')} />
                </Field>
                <Field label="Image" className="sm:col-span-2">
                  <Input
                    placeholder="https://…"
                    value={form.image_url}
                    onChange={set('image_url')}
                  />
                </Field>
                <Field label="Terms & Conditions *" className="sm:col-span-2">
                  <Textarea
                    rows={4}
                    value={form.terms_conditions}
                    onChange={set('terms_conditions')}
                  />
                </Field>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Field label="Do not redeem if coupon has been redeemed by a player as similar as (%)">
                  <Input
                    type="number"
                    placeholder="30"
                    value={form.abuse_similarity_percent}
                    onChange={set('abuse_similarity_percent')}
                  />
                </Field>
                <Field label="Exclude all players who have deposited real money and subsequently played for real money in the last (days)">
                  <Input
                    type="number"
                    placeholder="3"
                    value={form.abuse_deposited_days}
                    onChange={set('abuse_deposited_days')}
                  />
                </Field>
                <Field label="Exclude all players who have played for real money in the last (days)">
                  <Input
                    type="number"
                    value={form.abuse_played_days}
                    onChange={set('abuse_played_days')}
                  />
                </Field>
              </div>
            )}

            {step === 4 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-white">
                    Excluded Affiliates
                  </h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setExcluded(
                        excluded.length === affiliateRows.length
                          ? []
                          : affiliateRows.map((a) => a.id),
                      )
                    }
                  >
                    Select / Unselect All
                  </Button>
                </div>
                {affiliateRows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No affiliates to exclude.
                  </p>
                ) : (
                  <div className="max-h-96 divide-y divide-slate-800 overflow-y-auto rounded-lg border border-slate-800">
                    {affiliateRows.map((a) => (
                      <label
                        key={a.id}
                        className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/50"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-indigo-500/40"
                          checked={excluded.includes(a.id)}
                          onChange={() => toggleAffiliate(a.id)}
                        />
                        {a.name ?? a.username ?? `Affiliate ${a.id}`}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <Field label="Allowed Countries">
                <Input
                  placeholder="IN,NP,BD — blank means every country"
                  value={form.allowed_countries}
                  onChange={set('allowed_countries')}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Comma-separated ISO country codes.
                </p>
              </Field>
            )}

            {step === 6 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Wagering multiplier (×)">
                  <Input
                    type="number"
                    value={form.wagering_multiplier}
                    onChange={set('wagering_multiplier')}
                  />
                </Field>
                <Field label="Credits to">
                  <Select value={form.credit_target} onChange={set('credit_target')}>
                    <option value="bonus">Bonus balance</option>
                    <option value="main">Main balance</option>
                  </Select>
                </Field>
                <Field label="Bonus validity (days)">
                  <Input
                    type="number"
                    value={form.bonus_validity_days}
                    onChange={set('bonus_validity_days')}
                  />
                </Field>
                <Field label="Max bonus cap (₹)">
                  <Input
                    type="number"
                    value={form.max_bonus_cap}
                    onChange={set('max_bonus_cap')}
                  />
                </Field>
                <Field label="Max per user">
                  <Input
                    type="number"
                    value={form.per_user_limit}
                    onChange={set('per_user_limit')}
                  />
                </Field>
                <Field label="Total budget (₹)">
                  <Input
                    type="number"
                    value={form.total_budget}
                    onChange={set('total_budget')}
                  />
                </Field>
                <Field label="Starts">
                  <Input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={set('start_date')}
                  />
                </Field>
                <Field label="Ends">
                  <Input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={set('end_date')}
                  />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={set('status')}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </Select>
                </Field>

                <div className="sm:col-span-2">
                  <h3 className="font-display text-sm font-bold text-white">Claim conditions</h3>
                  <p className="mt-1 text-[11px] text-slate-500">
                    What a player must have before they can claim. Blank = no requirement.
                    Players see the offer with a disabled Claim button until every condition
                    is met; wagering and deposits only count between Starts and Ends above.
                  </p>
                </div>
                <Field label="Min real balance (₹)">
                  <Input
                    type="number"
                    min="0"
                    placeholder="None"
                    value={form.claim_min_balance}
                    onChange={set('claim_min_balance')}
                  />
                </Field>
                <Field label="Min wagered during offer (₹)">
                  <Input
                    type="number"
                    min="0"
                    placeholder="None"
                    value={form.claim_min_wagering}
                    onChange={set('claim_min_wagering')}
                  />
                </Field>
                <Field label="Min deposited during offer (₹)">
                  <Input
                    type="number"
                    min="0"
                    placeholder="None"
                    value={form.claim_min_deposit_total}
                    onChange={set('claim_min_deposit_total')}
                  />
                </Field>
              </div>
            )}
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              icon={ChevronLeft}
              disabled={step === 0}
              onClick={() => setStep((v) => v - 1)}
            >
              Previous
            </Button>
            {last ? (
              <Button type="button" icon={Save} busy={busy} onClick={save}>
                Save bonus
              </Button>
            ) : (
              <Button type="button" icon={ChevronRight} onClick={() => setStep((v) => v + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
