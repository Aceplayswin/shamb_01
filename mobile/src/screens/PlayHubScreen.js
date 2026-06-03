import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { BalanceCard } from '../components/BalanceCard';
import { GameCard } from '../components/GameCard';
import { useAuthStore } from '../store/auth';
import { FEATURED_GAMES } from '../data/mockGames';
import { colors, radius, spacing } from '../theme';

const QUICK_ACTIONS = [
  { icon: 'add-circle', label: 'Deposit', screen: 'Deposit', color: colors.green },
  { icon: 'remove-circle', label: 'Withdraw', screen: 'Withdraw', color: colors.orange },
  { icon: 'list', label: 'History', screen: 'Transactions', color: colors.brand400 },
  { icon: 'headset', label: 'Support', screen: 'Support', color: colors.purple },
];

export function PlayHubScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Quick play</Text>
          <Text style={styles.title}>Start winning</Text>
        </View>
        <View style={styles.badge}>
          <Icon name="flash" size={14} color={colors.background} />
          <Text style={styles.badgeText}>LIVE</Text>
        </View>
      </View>

      {token ? (
        <BalanceCard />
      ) : (
        <Pressable style={styles.guestCard} onPress={() => navigation.navigate('Login')}>
          <Icon name="log-in-outline" size={28} color={colors.brand400} />
          <View style={styles.guestText}>
            <Text style={styles.guestTitle}>Sign in to play</Text>
            <Text style={styles.guestSub}>Demo account includes ₹50,000 virtual balance</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.textDim} />
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.actions}>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.label}
            style={styles.actionBtn}
            onPress={() => {
              if (!token && a.screen !== 'Support') {
                navigation.navigate('Login');
                return;
              }
              navigation.navigate(a.screen);
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${a.color}22` }]}>
              <Icon name={a.icon} size={24} color={a.color} />
            </View>
            <Text style={styles.actionLabel}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Featured games</Text>
      <View style={styles.grid}>
        {FEATURED_GAMES.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onPress={(g) => {
              if (!token) {
                navigation.navigate('Login');
                return;
              }
              navigation.navigate('Play', { game: g });
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  eyebrow: { color: colors.brand400, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.red,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface800,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  guestText: { flex: 1 },
  guestTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  guestSub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionBtn: { flex: 1, alignItems: 'center' },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  actionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
});
