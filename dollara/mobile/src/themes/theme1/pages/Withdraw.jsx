// Theme 1 Withdraw — amount → payout destination → review → confirmation.
//
// Submitting locks the amount from the available balance and creates a PENDING
// withdrawal awaiting admin approval. Nothing is debited until that approval —
// which is why the confirmation spells out balance vs. hold vs. available.

import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/auth';
import { useTheme } from '../../../hooks/useBranding';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { useThemedStyles } from '../../useThemedStyles';
import { inr } from '../../../lib/format';
import { radius, spacing, typography } from '../../palettes';
import { Button, Card, Input, Label, Row, Stepper } from '../components/ui';

const MIN_WITHDRAWAL = 500;

const METHODS = [
  { id: 'bank_transfer', label: 'Bank', desc: 'NEFT / IMPS to your account', icon: 'business' },
  { id: 'upi', label: 'UPI', desc: 'Instant to your UPI ID', icon: 'phone-portrait' },
  { id: 'crypto', label: 'Crypto', desc: 'USDT (TRC20)', icon: 'logo-bitcoin' },
];

const STEPS = ['Amount', 'Details', 'Review'];

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  error: {
    ...typography.body,
    color: t.danger[400],
    backgroundColor: t.danger[500] + '1a',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  card: { marginTop: spacing.xl },
  availRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  availLabel: { ...typography.body, color: t.muted },
  availValue: { ...typography.body, fontWeight: '800', color: t.emerald[400] },
  amountField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    backgroundColor: t.surface[700],
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  currency: { fontSize: 22, color: t.muted },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '700', color: t.appFg, paddingVertical: 14, paddingHorizontal: spacing.sm },
  pctRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  pct: { flex: 1, alignItems: 'center', borderRadius: radius.md, backgroundColor: t.surface[700], paddingVertical: 10 },
  pctText: { fontSize: 13, fontWeight: '700', color: t.appFg },
  hint: { ...typography.caption, color: t.muted, marginTop: spacing.md },
  hintBad: { color: t.danger[400] },
  methods: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  method: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    paddingVertical: spacing.lg,
  },
  methodActive: { borderColor: t.brand[500], backgroundColor: t.brandA(500, 0.1) },
  methodLabel: { fontSize: 12, fontWeight: '700', color: t.appFg },
  fields: { gap: spacing.lg, marginTop: spacing.xl },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg },
  noteText: { ...typography.caption, color: t.muted, flex: 1, lineHeight: 16 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  done: { alignItems: 'center', paddingVertical: spacing.lg },
  doneTitle: { ...typography.title, color: t.appFg, marginTop: spacing.md },
  doneText: { ...typography.body, color: t.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  receipt: {
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.07),
    backgroundColor: t.hairline(0.02),
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
});

const EMPTY_DEST = { accountName: '', accountNumber: '', ifsc: '', upiId: '', address: '' };

export default function Theme1Withdraw({ navigation }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const authed = useRequireAuth(navigation);

  const wallet = useAuthStore((st) => st.wallet);
  const refreshSession = useAuthStore((st) => st.refreshSession);

  const [step, setStep] = useState('amount'); // amount | details | review | done
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [dest, setDest] = useState(EMPTY_DEST);
  const [transactionId, setTransactionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authed) refreshSession();
  }, [authed, refreshSession]);

  const available = wallet?.available ?? 0;
  const walletBalance = wallet?.main ?? wallet?.real ?? 0;
  const held = wallet?.pendingWithdrawal ?? wallet?.locked ?? 0;
  const numAmount = parseFloat(amount) || 0;
  const amountValid = numAmount >= MIN_WITHDRAWAL && numAmount <= available;
  const stepIndex = { amount: 0, details: 1, review: 2, done: 2 }[step];

  if (!authed) return null;

  const destValid = () => {
    if (method === 'bank_transfer') {
      return dest.accountName && dest.accountNumber.length >= 6 && dest.ifsc;
    }
    if (method === 'upi') return /.+@.+/.test(dest.upiId);
    if (method === 'crypto') return dest.address.length >= 10;
    return false;
  };

  const destSummary = () => {
    if (method === 'bank_transfer') {
      return `${dest.accountName} · A/C ••••${dest.accountNumber.slice(-4)}`;
    }
    if (method === 'upi') return dest.upiId;
    if (method === 'crypto') return `${dest.address.slice(0, 6)}…${dest.address.slice(-4)}`;
    return '';
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api('/api/v1/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: numAmount, paymentMethod: method }),
      });
      setTransactionId(res.transactionId);
      await refreshSession();
      setStep('done');
    } catch (e) {
      setError(e?.message ?? 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep('amount');
    setAmount('');
    setDest(EMPTY_DEST);
    setTransactionId(null);
    setError(null);
  };

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {step !== 'done' ? <Stepper steps={STEPS} current={stepIndex} /> : null}
      {error ? <Text style={s.error}>{error}</Text> : null}

      {step === 'amount' ? (
        <>
          <Card style={s.card}>
            <View style={s.availRow}>
              <Text style={s.availLabel}>Available to withdraw</Text>
              <Text style={s.availValue}>{inr(available)}</Text>
            </View>
            {/* A raw TextInput, not <Input>: this field draws its own oversized
                currency box, and <Input> would nest a second bordered frame. */}
            <View style={s.amountField}>
              <Text style={s.currency}>₹</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={t.muted}
                keyboardType="numeric"
                autoFocus
                style={s.amountInput}
              />
            </View>
            <View style={s.pctRow}>
              {[0.25, 0.5, 0.75, 1].map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setAmount(String(Math.floor(available * p)))}
                  accessibilityRole="button"
                  style={s.pct}
                >
                  <Text style={s.pctText}>{p === 1 ? 'Max' : `${p * 100}%`}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.hint}>
              Minimum withdrawal {inr(MIN_WITHDRAWAL)}.
              {numAmount > available ? (
                <Text style={s.hintBad}> Amount exceeds balance.</Text>
              ) : null}
            </Text>
          </Card>

          <Button
            title="Continue"
            disabled={!amountValid}
            onPress={() => setStep('details')}
            style={{ marginTop: spacing.xl }}
          />
        </>
      ) : null}

      {step === 'details' ? (
        <>
          <Card style={s.card}>
            <Label>Payout method</Label>
            <View style={s.methods}>
              {METHODS.map((m) => {
                const active = method === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setMethod(m.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[s.method, active && s.methodActive]}
                  >
                    <Icon name={m.icon} size={19} color={active ? t.brand[400] : t.muted} />
                    <Text style={s.methodLabel}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.fields}>
              {method === 'bank_transfer' ? (
                <>
                  <Input
                    label="Account holder name"
                    value={dest.accountName}
                    onChangeText={(v) => setDest({ ...dest, accountName: v })}
                    placeholder="As per bank records"
                    autoCapitalize="words"
                  />
                  <Input
                    label="Account number"
                    value={dest.accountNumber}
                    onChangeText={(v) => setDest({ ...dest, accountNumber: v })}
                    placeholder="Bank account number"
                    keyboardType="number-pad"
                  />
                  <Input
                    label="IFSC code"
                    value={dest.ifsc}
                    onChangeText={(v) => setDest({ ...dest, ifsc: v.toUpperCase() })}
                    placeholder="e.g. HDFC0001234"
                    autoCapitalize="characters"
                  />
                </>
              ) : null}
              {method === 'upi' ? (
                <Input
                  label="UPI ID"
                  value={dest.upiId}
                  onChangeText={(v) => setDest({ ...dest, upiId: v })}
                  placeholder="yourname@bank"
                />
              ) : null}
              {method === 'crypto' ? (
                <Input
                  label="USDT wallet address (TRC20)"
                  value={dest.address}
                  onChangeText={(v) => setDest({ ...dest, address: v })}
                  placeholder="T..."
                />
              ) : null}
            </View>
          </Card>

          <View style={s.actions}>
            <Button title="Back" variant="outline" onPress={() => setStep('amount')} style={{ flex: 1 }} />
            <Button
              title="Review"
              disabled={!destValid()}
              onPress={() => setStep('review')}
              style={{ flex: 2 }}
            />
          </View>
        </>
      ) : null}

      {step === 'review' ? (
        <>
          <Card style={s.card}>
            <Label>Review withdrawal</Label>
            <View style={{ marginTop: spacing.md }}>
              <Row label="Amount" value={inr(numAmount)} />
              <Row label="Processing fee" value={inr(0)} />
              <Row label="Method" value={METHODS.find((m) => m.id === method)?.label} />
              <Row label="Destination" value={destSummary()} />
              <Row label="Est. time" value="2–24 hours" />
              <Row label="You'll receive" value={inr(numAmount)} strong last />
            </View>
            <View style={s.note}>
              <Icon name="time-outline" size={13} color={t.muted} />
              <Text style={s.noteText}>
                Funds are held from your balance while we process this request.
              </Text>
            </View>
          </Card>

          <View style={s.actions}>
            <Button title="Back" variant="outline" onPress={() => setStep('details')} style={{ flex: 1 }} />
            <Button
              title={submitting ? 'Submitting…' : 'Confirm'}
              loading={submitting}
              onPress={submit}
              style={{ flex: 2 }}
            />
          </View>
        </>
      ) : null}

      {step === 'done' ? (
        <>
          <Card style={s.card}>
            <View style={s.done}>
              <Icon name="time" size={52} color={t.brand[400]} />
              <Text style={s.doneTitle}>Withdrawal requested</Text>
              <Text style={s.doneText}>
                Your request is pending approval. The amount is held from your balance and will be
                paid out once our team approves it — or returned if it's rejected.
              </Text>
              <View style={s.receipt}>
                <Row label="Amount" value={inr(numAmount)} />
                <Row label="Method" value={METHODS.find((m) => m.id === method)?.label} />
                <Row label="Destination" value={destSummary()} />
                <Row label="Request ID" value={`#${transactionId}`} />
                <Row label="Wallet balance" value={inr(walletBalance)} />
                <Row label="On hold for this request" value={inr(held)} />
                <Row label="Available to play" value={inr(available)} last />
              </View>
            </View>
          </Card>

          <View style={s.actions}>
            <Button title="New withdrawal" variant="outline" onPress={reset} style={{ flex: 1 }} />
            <Button
              title="Go to wallet"
              onPress={() => navigation.navigate('wallet')}
              style={{ flex: 1 }}
            />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
