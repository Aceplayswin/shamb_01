'use client';

/**
 * Exchange Bonus — reference screen `/exchangebonus`.
 *
 * The reference takes a username and submits. Here the submit first reports
 * whether the player actually qualifies — and if not, every reason why — so
 * the operator sees the outcome before granting rather than after.
 */

import { useState } from 'react';
import { Gift, Search, CheckCircle2, XCircle } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import {
  AdminShell,
  Button,
  Card,
  Field,
  Input,
  Select,
  toast,
  useAdminData,
  inr,
} from '@/components/admin/AdminShell';

export default function ExchangeBonusPage() {
  const { data: bonuses } = useAdminData('/api/v1/admin/bonuses', []);
  const bonusRows = Array.isArray(bonuses) ? bonuses : bonuses?.rows ?? [];

  const [bonusId, setBonusId] = useState('');
  const [username, setUsername] = useState('');
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [granting, setGranting] = useState(false);

  const check = async (e) => {
    e.preventDefault();
    if (!bonusId) {
      toast.error('Choose a bonus first');
      return;
    }
    setChecking(true);
    setResult(null);
    try {
      const res = await adminApi(`/api/v1/admin/bo/bonuses/${bonusId}/eligibility`, {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      setResult(res);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setChecking(false);
    }
  };

  const grant = async () => {
    setGranting(true);
    try {
      await adminApi(`/api/v1/admin/bonuses/${bonusId}/grant`, {
        method: 'POST',
        body: JSON.stringify({ user_id: username, notes: 'Exchange Bonus redemption' }),
      });
      toast.success('Bonus redeemed for this player');
      setResult(null);
      setUsername('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGranting(false);
    }
  };

  return (
    <AdminShell
      title="Redeem Bonus"
      subtitle="Check a player against a bonus, then redeem it for them."
    >
      <div className="space-y-5">
        <Card className="p-5">
          <form onSubmit={check}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bonus *">
                <Select value={bonusId} onChange={(e) => setBonusId(e.target.value)} required>
                  <option value="">Select a bonus</option>
                  {bonusRows.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.display_title || b.name}
                      {b.promo_code ? ` (${b.promo_code})` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Username *">
                <Input
                  placeholder="Player username or ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </Field>
            </div>
            <div className="mt-5">
              <Button type="submit" icon={Search} busy={checking}>
                Submit
              </Button>
            </div>
          </form>
        </Card>

        {result && (
          <Card className="p-5">
            <div className="flex items-start gap-3">
              {result.eligible ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-bold text-white">
                  {result.eligible
                    ? `${result.player} can redeem ${result.bonus_name}`
                    : `${result.player} cannot redeem ${result.bonus_name}`}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Value {inr(result.amount)} · claimed {result.times_claimed} time(s) before
                </p>

                {!result.eligible && (
                  <ul className="mt-3 space-y-1">
                    {result.reasons.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-sm text-rose-300">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-400" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}

                {result.eligible && (
                  <div className="mt-4">
                    <Button icon={Gift} busy={granting} onClick={grant}>
                      Redeem for this player
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
