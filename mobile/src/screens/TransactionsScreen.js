import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState } from '../components/EmptyState';
import { useWalletStore } from '../store/walletStore';
import { colors, radius, spacing } from '../theme';

const FILTERS = ['all', 'deposit', 'withdraw', 'bet', 'win', 'bonus'];

export function TransactionsScreen() {
  const transactions = useWalletStore((s) => s.transactions);
  const [filter, setFilter] = useState('all');

  const filtered =
    filter === 'all' ? transactions : transactions.filter((t) => t.type === filter);

  return (
    <View style={styles.flex}>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.listContent}
        data={filtered}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="No transactions" message="Your activity will appear here." />
        }
        renderItem={({ item }) => <TransactionRow item={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface800,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: { backgroundColor: colors.brand500, borderColor: colors.brand500 },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  filterTextActive: { color: colors.background },
  list: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1 },
});
