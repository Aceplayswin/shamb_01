import { StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors, radius, spacing } from '../theme';

const TYPE_CONFIG = {
  deposit: { icon: 'arrow-down-circle', color: colors.green },
  withdraw: { icon: 'arrow-up-circle', color: colors.orange },
  bet: { icon: 'game-controller', color: colors.textMuted },
  win: { icon: 'trophy', color: colors.green },
  bonus: { icon: 'gift', color: colors.brand400 },
};

export function TransactionRow({ item }) {
  const cfg = TYPE_CONFIG[item.type] ?? { icon: 'swap-horizontal', color: colors.textMuted };
  const isCredit = ['deposit', 'win', 'bonus'].includes(item.type);
  const amount = parseFloat(item.amount);

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: `${cfg.color}22` }]}>
        <Icon name={cfg.icon} size={22} color={cfg.color} />
      </View>
      <View style={styles.mid}>
        <Text style={styles.type}>{item.type.replace('_', ' ')}</Text>
        <Text style={styles.meta}>
          {item.method ? `${item.method} · ` : ''}
          {new Date(item.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, isCredit ? styles.credit : styles.debit]}>
          {isCredit ? '+' : '-'}₹{amount.toLocaleString('en-IN')}
        </Text>
        <Text style={[styles.status, item.status === 'completed' && styles.statusOk]}>
          {item.status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface800,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mid: { flex: 1 },
  type: { color: colors.text, fontWeight: '600', textTransform: 'capitalize', fontSize: 15 },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  amount: { fontWeight: '700', fontSize: 15 },
  credit: { color: colors.green },
  debit: { color: colors.text },
  status: { color: colors.orange, fontSize: 11, marginTop: 2, textTransform: 'capitalize' },
  statusOk: { color: colors.green },
});
