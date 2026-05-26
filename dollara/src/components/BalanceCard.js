import { StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { useWalletStore } from '../store/walletStore';
import { colors, radius, spacing } from '../theme';

export function BalanceCard({ compact = false }) {
  const wallet = useWalletStore((s) => s.wallet);
  if (!wallet) return null;

  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  if (compact) {
    return (
      <View style={styles.compact}>
        <Icon name="wallet-outline" size={16} color={colors.brand400} />
        <Text style={styles.compactAmount}>{fmt(wallet.available)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.glow} />
      <Text style={styles.eyebrow}>Total balance</Text>
      <Text style={styles.total}>{fmt(wallet.available)}</Text>
      <View style={styles.row}>
        <Stat label="Main" value={fmt(wallet.main)} color={colors.green} />
        <View style={styles.divider} />
        <Stat label="Bonus" value={fmt(wallet.bonus)} color={colors.orange} />
        <View style={styles.divider} />
        <Stat label="Locked" value={fmt(wallet.locked)} color={colors.textMuted} />
      </View>
    </View>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface700,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 152, 0, 0.12)',
  },
  eyebrow: {
    ...{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
    color: colors.textDim,
    marginBottom: spacing.xs,
  },
  total: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { color: colors.textDim, fontSize: 10, textTransform: 'uppercase', marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '700' },
  divider: { width: 1, height: 28, backgroundColor: colors.border },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface700,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactAmount: { color: colors.green, fontWeight: '700', fontSize: 13 },
});
