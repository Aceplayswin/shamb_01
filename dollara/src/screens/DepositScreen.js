import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Input } from '../components/Input';
import { useWalletStore } from '../store/walletStore';
import { colors, radius, spacing } from '../theme';

const QUICK = [500, 1000, 2500, 5000, 10000];
const METHODS = [
  { id: 'upi', label: 'UPI', desc: 'Instant', icon: 'phone-portrait-outline' },
  { id: 'imps', label: 'IMPS', desc: 'Instant transfer', icon: 'swap-horizontal' },
  { id: 'bank_transfer', label: 'Bank', desc: '5–30 min', icon: 'business-outline' },
  { id: 'crypto', label: 'Crypto', desc: 'BTC, ETH, USDT', icon: 'logo-bitcoin' },
];

export function DepositScreen({ navigation }) {
  const deposit = useWalletStore((s) => s.deposit);
  const confirmDeposit = useWalletStore((s) => s.confirmDeposit);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState(null);

  const num = parseFloat(amount) || 0;
  const bonus = num >= 1000 ? num * 0.1 : 0;

  const submit = async () => {
    if (!method || num < 100) {
      Alert.alert('Invalid', 'Min deposit ₹100. Select a payment method.');
      return;
    }
    setLoading(true);
    try {
      const res = await deposit(num, method);
      setTxId(res.transactionId);
      Alert.alert(
        'Deposit initiated',
        `Transaction ${res.transactionId}\n\nTap confirm below to credit instantly (demo).`,
      );
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!txId) return;
    setLoading(true);
    try {
      const res = await confirmDeposit(txId);
      Alert.alert('Credited', `₹${res.credited.toLocaleString('en-IN')} added to wallet`);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Confirm failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Card>
        <Input
          label="Amount (₹)"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          placeholder="Enter amount"
        />
        <View style={styles.quick}>
          {QUICK.map((a) => (
            <Pressable key={a} style={styles.chip} onPress={() => setAmount(String(a))}>
              <Text style={styles.chipText}>₹{a.toLocaleString('en-IN')}</Text>
            </Pressable>
          ))}
        </View>
        {num > 0 ? (
          <View style={styles.bonusRow}>
            <Icon name="gift-outline" size={16} color={colors.green} />
            <Text style={styles.bonus}>
              Playable: ₹{(num + bonus).toLocaleString('en-IN')}
              {bonus > 0 ? ` (incl. ₹${bonus} bonus)` : ''}
            </Text>
          </View>
        ) : null}
      </Card>

      <Text style={styles.section}>Payment method</Text>
      {METHODS.map((m) => (
        <Pressable
          key={m.id}
          style={[styles.method, method === m.id && styles.methodActive]}
          onPress={() => setMethod(m.id)}
        >
          <Icon name={m.icon} size={22} color={method === m.id ? colors.brand400 : colors.textDim} />
          <View style={styles.methodBody}>
            <Text style={styles.methodLabel}>{m.label}</Text>
            <Text style={styles.methodDesc}>{m.desc}</Text>
          </View>
          {method === m.id ? <Icon name="checkmark-circle" size={22} color={colors.brand400} /> : null}
        </Pressable>
      ))}

      <Button title="Proceed" onPress={submit} loading={loading} style={styles.mt} />
      {txId ? (
        <Button title="Confirm deposit (demo)" variant="secondary" onPress={confirm} loading={loading} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    backgroundColor: colors.surface700,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  bonusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bonus: { color: colors.green, fontWeight: '600', flex: 1 },
  section: { color: colors.text, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm },
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
  methodActive: { borderColor: colors.brand500, backgroundColor: 'rgba(255, 152, 0, 0.08)' },
  methodBody: { flex: 1 },
  methodLabel: { color: colors.text, fontWeight: '600' },
  methodDesc: { color: colors.textDim, fontSize: 12 },
  mt: { marginTop: spacing.lg },
});
