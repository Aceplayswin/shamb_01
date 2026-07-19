// ─────────────────────────────────────────────────────────────────────────────
//  PAYMENT GATEWAY — integration surface
//
//  This is the ONE place the checkout UI lives. Today it runs in "sandbox" mode:
//  it renders a realistic, method-specific payment sheet and simulates the
//  provider round-trip, then calls `onConfirm(reference)`.
//
//  TO ATTACH A REAL GATEWAY (Razorpay / Stripe / Cashfree / …):
//    1. Server: create an order for `amount` and return an order id / token.
//    2. Here: in `pay()`, instead of the simulated delay, open the provider SDK
//       (e.g. RazorpayCheckout.open(options)), passing that order id.
//    3. On the provider's success callback, call `onConfirm(providerPaymentId)`.
//    4. On failure/dismiss, surface the error (setError) and stay on the form.
//  The surrounding Deposit flow and the success screen do not change — only the
//  body of `pay()` below.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../hooks/useBranding';
import { useThemedStyles } from '../../useThemedStyles';
import { inr } from '../../../lib/format';
import { radius, spacing, typography } from '../../palettes';
import { Button, Card, Input } from './ui';

const SANDBOX = true; // flip to false once a real provider is wired into pay()

const METHOD_UI = {
  upi: { icon: 'phone-portrait', label: 'UPI', payee: 'dollara@upi' },
  card: { icon: 'card', label: 'Card' },
  netbanking: { icon: 'business', label: 'Net Banking' },
  bank_transfer: { icon: 'business', label: 'Bank Transfer' },
  crypto: { icon: 'logo-bitcoin', label: 'Crypto', address: '0x7A9f…c3Bd2 (USDT · TRC20)' },
};

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra'];

function generateReference() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PAY${Date.now().toString().slice(-8)}${rand}`;
}

const styles = (t) => ({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
    marginBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.hairline(0.09),
  },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  headIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.brandA(500, 0.15),
  },
  headTitle: { fontSize: 14, fontWeight: '700', color: t.appFg },
  headSub: { ...typography.caption, color: t.muted },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  secureText: { ...typography.caption, color: t.muted },
  error: {
    ...typography.body,
    color: t.danger[400],
    backgroundColor: t.danger[500] + '1a',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  qrBox: {
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    backgroundColor: t.surface[700],
    padding: spacing.lg,
  },
  qr: {
    width: 108,
    height: 108,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.hairline(0.05),
  },
  qrText: { ...typography.caption, color: t.muted, textAlign: 'center' },
  payee: { color: t.appFg, fontWeight: '700' },
  banks: { gap: spacing.sm },
  bank: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  bankActive: { borderColor: t.brand[500], backgroundColor: t.brandA(500, 0.1) },
  bankText: { ...typography.body, color: t.appFg },
  cryptoBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    backgroundColor: t.surface[700],
    padding: spacing.lg,
    gap: 4,
  },
  cryptoLabel: { ...typography.body, color: t.muted },
  cryptoValue: { fontSize: 18, fontWeight: '800', color: t.appFg },
  cryptoAddr: { fontSize: 13, color: t.appFg, fontFamily: undefined },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
  sandbox: { ...typography.caption, color: t.muted, textAlign: 'center', marginTop: spacing.md },
  processing: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  processingTitle: { ...typography.section, color: t.appFg },
  processingText: { ...typography.body, color: t.muted, textAlign: 'center' },
});

export function PaymentGateway({ amount, method = 'upi', onConfirm, onCancel }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const ui = METHOD_UI[method] ?? METHOD_UI.upi;

  const [phase, setPhase] = useState('form'); // 'form' | 'processing'
  const [error, setError] = useState(null);

  // Method-specific (sandbox) inputs — accepted as-is; a real gateway collects
  // these on its own hosted sheet.
  const [upiId, setUpiId] = useState('');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [bank, setBank] = useState(BANKS[0]);

  const pay = async () => {
    setError(null);
    setPhase('processing');
    const reference = generateReference();
    try {
      // Simulated provider round-trip. Replace with the real checkout call.
      await new Promise((r) => setTimeout(r, 1800));
      await onConfirm(reference);
      // On success the parent advances the step and unmounts this component.
    } catch (e) {
      setError(e?.message ?? 'Payment failed. Please try again.');
      setPhase('form');
    }
  };

  if (phase === 'processing') {
    return (
      <Card>
        <View style={s.processing}>
          <ActivityIndicator size="large" color={t.brand[400]} />
          <Text style={s.processingTitle}>Processing payment…</Text>
          <Text style={s.processingText}>
            Securely confirming {inr(amount)} via {ui.label}. Please don't close this screen.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <View style={s.head}>
        <View style={s.headLeft}>
          <View style={s.headIcon}>
            <Icon name={ui.icon} size={19} color={t.brand[400]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headTitle}>Pay with {ui.label}</Text>
            <Text style={s.headSub}>Amount {inr(amount)}</Text>
          </View>
        </View>
        <View style={s.secure}>
          <Icon name="lock-closed" size={12} color={t.muted} />
          <Text style={s.secureText}>Secure</Text>
        </View>
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      {method === 'upi' ? (
        <View style={{ gap: spacing.lg }}>
          <View style={s.qrBox}>
            <View style={s.qr}>
              <Icon name="qr-code" size={44} color={t.muted} />
            </View>
            <Text style={s.qrText}>
              Scan with any UPI app, or pay to <Text style={s.payee}>{ui.payee}</Text>
            </Text>
          </View>
          <Input
            label="Or enter your UPI ID"
            value={upiId}
            onChangeText={setUpiId}
            placeholder="yourname@bank"
          />
        </View>
      ) : null}

      {method === 'card' ? (
        <View style={{ gap: spacing.lg }}>
          <Input
            label="Card number"
            value={card.number}
            onChangeText={(v) => setCard({ ...card, number: v })}
            placeholder="1234 5678 9012 3456"
            keyboardType="number-pad"
            maxLength={19}
          />
          <Input
            label="Name on card"
            value={card.name}
            onChangeText={(v) => setCard({ ...card, name: v })}
            placeholder="Full name"
            autoCapitalize="words"
          />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Input
              label="Expiry"
              value={card.expiry}
              onChangeText={(v) => setCard({ ...card, expiry: v })}
              placeholder="MM/YY"
              maxLength={5}
              style={{ flex: 1 }}
            />
            <Input
              label="CVV"
              value={card.cvv}
              onChangeText={(v) => setCard({ ...card, cvv: v })}
              placeholder="•••"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}

      {method === 'netbanking' || method === 'bank_transfer' ? (
        <View style={s.banks}>
          <Text style={[s.cryptoLabel, { marginBottom: 2 }]}>Select your bank</Text>
          {BANKS.map((b) => (
            <Text
              key={b}
              accessibilityRole="button"
              onPress={() => setBank(b)}
              style={[s.bank, s.bankText, bank === b && s.bankActive]}
            >
              {b}
            </Text>
          ))}
        </View>
      ) : null}

      {method === 'crypto' ? (
        <View style={s.cryptoBox}>
          <Text style={s.cryptoLabel}>Send exactly</Text>
          <Text style={s.cryptoValue}>{inr(amount)} in USDT</Text>
          <Text style={[s.cryptoLabel, { marginTop: spacing.md }]}>To wallet address</Text>
          <Text style={s.cryptoAddr}>{ui.address}</Text>
        </View>
      ) : null}

      <View style={s.actions}>
        <Button title={`Pay ${inr(amount)}`} onPress={pay} />
        <Button title="Cancel" variant="outline" onPress={onCancel} />
      </View>

      {SANDBOX ? <Text style={s.sandbox}>SANDBOX MODE · NO REAL CHARGE</Text> : null}
    </Card>
  );
}
