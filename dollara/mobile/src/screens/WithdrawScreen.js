import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Input } from '../components/Input';
import { useAuthStore } from '../store/auth';
import { useWalletStore } from '../store/walletStore';
import { colors, radius, spacing } from '../theme';

const METHODS = [
  { id: 'bank_transfer', label: 'Bank transfer', icon: 'business-outline' },
  { id: 'upi', label: 'UPI', icon: 'phone-portrait-outline' },
  { id: 'crypto', label: 'Crypto', icon: 'logo-bitcoin' },
];

export function WithdrawScreen({ navigation }) {
  const wallet = useWalletStore((s) => s.wallet);
  const withdraw = useWalletStore((s) => s.withdraw);
  const user = useAuthStore((s) => s.user);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [loading, setLoading] = useState(false);

  const available = wallet?.available ?? 0;
  const num = parseFloat(amount) || 0;
  const kycOk = user?.kyc_status === 'verified';

  const setPct = (p) => setAmount(String(Math.floor(available * p)));

  const submit = async () => {
    if (num < 500) {
      Alert.alert('Minimum', 'Minimum withdrawal is ₹500');
      return;
    }
    if (!kycOk) {
      Alert.alert('KYC required', 'Complete KYC verification from your profile first.');
      return;
    }
    setLoading(true);
    try {
      await withdraw(num, method);
      Alert.alert(
        'Submitted',
        'Withdrawal request submitted — pending approval. The amount is held until our team approves or rejects it.',
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.availCard}>
        <Text style={styles.availLabel}>Available to withdraw</Text>
        <Text style={styles.availAmount}>₹{available.toLocaleString('en-IN')}</Text>
      </View>

      <Card>
        <Input label="Amount (₹)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <View style={styles.pctRow}>
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <Pressable key={p} style={styles.pct} onPress={() => setPct(p)}>
              <Text style={styles.pctText}>{p === 1 ? 'Max' : `${p * 100}%`}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={styles.checklist}>
        <Text style={styles.checkTitle}>Verification</Text>
        <CheckItem ok={kycOk} label={`KYC: ${user?.kyc_status ?? 'unknown'}`} />
        <CheckItem ok label="Bank account linked (demo)" />
      </Card>

      <Text style={styles.label}>Withdrawal method</Text>
      {METHODS.map((m) => (
        <Pressable
          key={m.id}
          style={[styles.method, method === m.id && styles.methodActive]}
          onPress={() => setMethod(m.id)}
        >
          <Icon name={m.icon} size={22} color={method === m.id ? colors.brand400 : colors.textDim} />
          <Text style={styles.methodText}>{m.label}</Text>
          {method === m.id ? <Icon name="checkmark-circle" size={20} color={colors.brand400} /> : null}
        </Pressable>
      ))}

      <Button title="Request withdrawal" onPress={submit} loading={loading} style={styles.mt} />
    </ScrollView>
  );
}

function CheckItem({ ok, label }) {
  return (
    <View style={styles.checkRow}>
      <Icon name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={ok ? colors.green : colors.orange} />
      <Text style={[styles.checkText, ok ? styles.ok : styles.warn]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  availCard: {
    backgroundColor: colors.surface800,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  availLabel: { color: colors.textMuted, fontSize: 13 },
  availAmount: { color: colors.green, fontSize: 28, fontWeight: '800', marginTop: 4 },
  pctRow: { flexDirection: 'row', gap: spacing.sm },
  pct: {
    flex: 1,
    backgroundColor: colors.surface700,
    padding: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  pctText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  checklist: { marginTop: spacing.md },
  checkTitle: { color: colors.text, fontWeight: '700', marginBottom: spacing.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  checkText: { fontSize: 14 },
  ok: { color: colors.green },
  warn: { color: colors.orange },
  label: { color: colors.text, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface800,
  },
  methodActive: { borderColor: colors.brand500 },
  methodText: { flex: 1, color: colors.text, fontWeight: '600' },
  mt: { marginTop: spacing.lg },
});
