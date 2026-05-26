import { StyleSheet, Text, View } from 'react-native';
import { useWalletStore } from '../store/walletStore';
import { colors, spacing } from '../theme';

export function WalletBar() {
  const wallet = useWalletStore((s) => s.wallet);
  if (!wallet) return null;

  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

  return (
    <View style={styles.bar}>
      <View style={styles.item}>
        <Text style={styles.label}>Main</Text>
        <Text style={styles.main}>{fmt(wallet.main)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={styles.label}>Bonus</Text>
        <Text style={styles.bonus}>{fmt(wallet.bonus)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={styles.label}>Available</Text>
        <Text style={styles.available}>{fmt(wallet.available)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface700,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: colors.border },
  label: {
    color: colors.textDim,
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  main: { color: colors.green, fontWeight: '700', fontSize: 14 },
  bonus: { color: colors.orange, fontWeight: '600', fontSize: 14 },
  available: { color: colors.text, fontWeight: '600', fontSize: 14 },
});
