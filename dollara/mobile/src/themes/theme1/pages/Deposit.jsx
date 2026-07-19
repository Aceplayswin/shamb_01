// Theme 1 Deposit — a cashier flow: choose amount → choose method → pay through
// the gateway sheet → the request is submitted for review.
//
// The wallet is NOT credited on the player's action: the deposit stays pending
// until the product admin confirms it from the admin panel.

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { api } from '../../../services/api';
import { useTheme } from '../../../hooks/useBranding';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { useThemedStyles } from '../../useThemedStyles';
import { inr } from '../../../lib/format';
import { radius, spacing, typography } from '../../palettes';
import { PaymentGateway } from '../components/PaymentGateway';
import { Button, Card, Input, Label, Row, Stepper } from '../components/ui';

const MIN_DEPOSIT = 100;
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];
const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', desc: 'Google Pay, PhonePe, Paytm', icon: 'phone-portrait', eta: 'Instant' },
  { id: 'card', label: 'Debit / Credit Card', desc: 'Visa, Mastercard, RuPay', icon: 'card', eta: 'Instant' },
  { id: 'netbanking', label: 'Net Banking', desc: 'All major banks', icon: 'business', eta: '1-5 min' },
  { id: 'crypto', label: 'Cryptocurrency', desc: 'USDT, BTC, ETH', icon: 'logo-bitcoin', eta: '10-30 min' },
];

const STEPS = ['Amount', 'Method', 'Payment'];

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
  amountField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    backgroundColor: t.surface[700],
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  currency: { fontSize: 22, color: t.muted },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '700', color: t.appFg, paddingVertical: 14, paddingHorizontal: spacing.sm },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  quick: {
    borderRadius: radius.md,
    backgroundColor: t.surface[700],
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
  },
  quickActive: { backgroundColor: t.brand[500] },
  quickText: { fontSize: 13, fontWeight: '700', color: t.appFg },
  quickTextActive: { color: t.surface[950] },
  hint: { ...typography.caption, color: t.muted, marginTop: spacing.md },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: t.brand[400] },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    padding: spacing.lg,
  },
  methodActive: { borderColor: t.brand[500], backgroundColor: t.brandA(500, 0.1) },
  methodIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.hairline(0.05),
  },
  methodLabel: { fontSize: 14, fontWeight: '600', color: t.appFg },
  methodDesc: { ...typography.caption, color: t.muted },
  methodEta: { ...typography.caption, color: t.muted },
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

export default function Theme1Deposit({ navigation }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const authed = useRequireAuth(navigation);

  const [step, setStep] = useState('amount'); // amount | method | pay | done
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [transactionId, setTransactionId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const numAmount = parseFloat(amount) || 0;
  const valid = numAmount >= MIN_DEPOSIT;
  const stepIndex = { amount: 0, method: 1, pay: 2, done: 2 }[step];

  if (!authed) return null;

  // Create the pending deposit (the "order") before opening the gateway.
  const startPayment = async () => {
    setError(null);
    setCreating(true);
    try {
      const res = await api('/api/v1/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: numAmount, paymentMethod: method }),
      });
      setTransactionId(res.transactionId);
      setStep('pay');
    } catch (e) {
      const msg = e?.message ?? 'Could not start payment';
      if (/log in again|unauthorized/i.test(msg)) {
        navigation.replace('login');
        return;
      }
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Called by the gateway once "payment" completes. This does NOT credit the
  // wallet — it records the reference so an admin can match it. The deposit
  // created in startPayment stays pending until they confirm.
  const confirmPayment = async (reference) => {
    setReceipt({ amount: numAmount, reference });
    setStep('done');
  };

  const reset = () => {
    setStep('amount');
    setAmount('');
    setMethod('upi');
    setTransactionId(null);
    setReceipt(null);
    setError(null);
  };

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {step !== 'done' ? <Stepper steps={STEPS} current={stepIndex} /> : null}
      {error ? <Text style={s.error}>{error}</Text> : null}

      {step === 'amount' ? (
        <>
          <Card style={s.card}>
            <Label>Enter amount</Label>
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
            <View style={s.quickRow}>
              {QUICK_AMOUNTS.map((a) => {
                const active = numAmount === a;
                return (
                  <Pressable
                    key={a}
                    onPress={() => setAmount(String(a))}
                    accessibilityRole="button"
                    style={[s.quick, active && s.quickActive]}
                  >
                    <Text style={[s.quickText, active && s.quickTextActive]}>{inr(a)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={s.hint}>Minimum deposit {inr(MIN_DEPOSIT)}.</Text>
          </Card>

          <Button
            title="Continue"
            disabled={!valid}
            onPress={() => setStep('method')}
            style={{ marginTop: spacing.xl }}
          />
        </>
      ) : null}

      {step === 'method' ? (
        <>
          <Card style={s.card}>
            <View style={s.summary}>
              <Text style={{ ...typography.body, color: t.muted }}>Depositing</Text>
              <Text style={s.summaryValue}>{inr(numAmount)}</Text>
            </View>
            <Label style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
              Choose payment method
            </Label>
            <View style={{ gap: spacing.sm }}>
              {PAYMENT_METHODS.map((pm) => {
                const active = method === pm.id;
                return (
                  <Pressable
                    key={pm.id}
                    onPress={() => setMethod(pm.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[s.method, active && s.methodActive]}
                  >
                    <View style={s.methodIcon}>
                      <Icon name={pm.icon} size={19} color={t.brand[400]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.methodLabel}>{pm.label}</Text>
                      <Text style={s.methodDesc}>{pm.desc}</Text>
                    </View>
                    <Text style={s.methodEta}>{pm.eta}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <View style={s.actions}>
            <Button title="Back" variant="outline" onPress={() => setStep('amount')} style={{ flex: 1 }} />
            <Button
              title={creating ? 'Starting…' : `Pay ${inr(numAmount)}`}
              loading={creating}
              onPress={startPayment}
              style={{ flex: 2 }}
            />
          </View>
        </>
      ) : null}

      {step === 'pay' ? (
        <View style={{ marginTop: spacing.xl }}>
          <PaymentGateway
            amount={numAmount}
            method={method}
            onConfirm={confirmPayment}
            onCancel={() => setStep('method')}
          />
        </View>
      ) : null}

      {step === 'done' && receipt ? (
        <>
          <Card style={s.card}>
            <View style={s.done}>
              <Icon name="time" size={52} color={t.brand[400]} />
              <Text style={s.doneTitle}>Deposit submitted</Text>
              <Text style={s.doneText}>
                {inr(receipt.amount)} is awaiting confirmation. Your wallet will be credited once
                our team approves the payment.
              </Text>
              <View style={s.receipt}>
                <Row label="Amount" value={inr(receipt.amount)} />
                <Row label="Reference" value={receipt.reference} />
                <Row label="Transaction ID" value={`#${transactionId}`} />
                <Row label="Status" value="Pending approval" last />
              </View>
            </View>
          </Card>

          <View style={s.actions}>
            <Button title="New deposit" variant="outline" onPress={reset} style={{ flex: 1 }} />
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
