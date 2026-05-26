import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../components/Button';
import { BalanceCard } from '../components/BalanceCard';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { TransactionRow } from '../components/TransactionRow';
import { useAuthStore } from '../store/auth';
import { useWalletStore } from '../store/walletStore';
import { colors, radius, spacing } from '../theme';

export function WalletScreen({ navigation }) {
  const token = useAuthStore((s) => s.token);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const wallet = useWalletStore((s) => s.wallet);
  const transactions = useWalletStore((s) => s.transactions);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSession();
    setRefreshing(false);
  }, [refreshSession]);

  if (!token) {
    return (
      <View style={styles.flex}>
        <EmptyState
          icon="wallet-outline"
          title="Your wallet"
          message="Deposit, withdraw, and track all your gaming transactions in one place."
          actionLabel="Sign in"
          onAction={() => navigation.navigate('Login')}
        />
      </View>
    );
  }

  const recent = transactions.slice(0, 5);
  const pendingCount = transactions.filter((t) => t.status === 'pending' || t.status === 'processing').length;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand400} />
      }
      showsVerticalScrollIndicator={false}
    >
      <BalanceCard />

      {pendingCount > 0 ? (
        <View style={styles.pendingBanner}>
          <Icon name="time-outline" size={18} color={colors.orange} />
          <Text style={styles.pendingText}>
            {pendingCount} transaction{pendingCount > 1 ? 's' : ''} processing
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <ActionTile
          icon="add-circle"
          label="Deposit"
          color={colors.green}
          onPress={() => navigation.navigate('Deposit')}
        />
        <ActionTile
          icon="remove-circle"
          label="Withdraw"
          color={colors.orange}
          onPress={() => navigation.navigate('Withdraw')}
        />
        <ActionTile
          icon="swap-horizontal"
          label="Transfer"
          color={colors.brand400}
          onPress={() => navigation.navigate('Transactions')}
        />
        <ActionTile
          icon="gift"
          label="Bonus"
          color={colors.purple}
          onPress={() => navigation.navigate('Promotions')}
        />
      </View>

      <View style={styles.summaryRow}>
        <SummaryChip label="Exposure" value={wallet?.exposure ?? 0} />
        <SummaryChip label="In play" value={wallet?.locked ?? 0} />
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Recent activity</Text>
        <Pressable onPress={() => navigation.navigate('Transactions')}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>

      {recent.length > 0 ? (
        recent.map((tx) => <TransactionRow key={tx.id} item={tx} />)
      ) : (
        <Text style={styles.empty}>No transactions yet. Make a deposit to get started.</Text>
      )}

      <Button
        title="View full history"
        variant="secondary"
        onPress={() => navigation.navigate('Transactions')}
        style={styles.historyBtn}
      />
    </ScrollView>
  );
}

function ActionTile({ icon, label, color, onPress }) {
  return (
    <Pressable style={styles.actionTile} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: `${color}22` }]}>
        <Icon name={icon} size={26} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function SummaryChip({ label, value }) {
  const fmt = `₹${Number(value).toLocaleString('en-IN')}`;
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{fmt}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(251, 146, 60, 0.12)',
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  pendingText: { color: colors.orange, fontWeight: '600', fontSize: 13 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  actionTile: { alignItems: 'center', flex: 1 },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    flex: 1,
    backgroundColor: colors.surface800,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipLabel: { color: colors.textDim, fontSize: 11, textTransform: 'uppercase' },
  chipValue: { color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 4 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  seeAll: { color: colors.brand400, fontWeight: '600', fontSize: 13 },
  empty: { color: colors.textDim, textAlign: 'center', paddingVertical: spacing.xl },
  historyBtn: { marginTop: spacing.md },
});
