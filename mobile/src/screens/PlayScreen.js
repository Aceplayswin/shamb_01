import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Input } from '../components/Input';
import { WalletBar } from '../components/WalletBar';
import { useAuthStore } from '../store/auth';
import { useWalletStore } from '../store/walletStore';
import { colors, radius, spacing } from '../theme';

const CATEGORY_ICONS = {
  ai_games: 'sparkles',
  sports: 'football',
  slots: 'diamond',
  live_casino: 'videocam',
  lottery: 'ticket',
  fantasy: 'trophy',
};

export function PlayScreen({ route, navigation }) {
  const { game } = route.params;
  const token = useAuthStore((s) => s.token);
  const placeBet = useWalletStore((s) => s.placeBet);
  const [betAmount, setBetAmount] = useState(String(game.min_bet ?? 100));
  const [loading, setLoading] = useState(false);

  const iconName = CATEGORY_ICONS[game.category] ?? 'game-controller';
  const quickBets = [game.min_bet, game.min_bet * 2, game.min_bet * 5, game.min_bet * 10].filter(
    (b) => b <= (game.max_bet ?? 10000),
  );

  const placeBetHandler = async () => {
    if (!token) {
      navigation.navigate('Login');
      return;
    }
    const amount = parseFloat(betAmount);
    if (!amount || amount < (game.min_bet ?? 1)) {
      Alert.alert('Invalid bet', `Minimum bet is ₹${game.min_bet ?? 1}`);
      return;
    }
    setLoading(true);
    try {
      const result = await placeBet(amount, game);
      const won = result.status === 'won';
      Alert.alert(
        won ? 'You won!' : 'Better luck next time',
        won
          ? `Payout: ₹${result.payout.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
          : `Bet of ₹${amount.toLocaleString('en-IN')} placed on ${game.name}`,
      );
    } catch (e) {
      Alert.alert('Bet failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Icon name={iconName} size={40} color={colors.brand400} />
        </View>
        <Text style={styles.name}>{game.name}</Text>
        <Text style={styles.meta}>
          {game.provider_name ? `${game.provider_name} · ` : ''}RTP {game.rtp ?? '—'}%
        </Text>
        {game.is_provably_fair ? (
          <View style={styles.fairBadge}>
            <Icon name="shield-checkmark" size={14} color={colors.green} />
            <Text style={styles.fair}>Provably Fair</Text>
          </View>
        ) : null}
      </View>

      {token ? <WalletBar /> : null}

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Place your bet</Text>
        <Text style={styles.limits}>
          Min ₹{game.min_bet} · Max ₹{game.max_bet?.toLocaleString('en-IN')}
        </Text>
        <Input
          label="Bet amount (₹)"
          keyboardType="decimal-pad"
          value={betAmount}
          onChangeText={setBetAmount}
        />
        <View style={styles.quickRow}>
          {quickBets.map((b) => (
            <Text key={b} style={styles.quickChip} onPress={() => setBetAmount(String(b))}>
              ₹{b}
            </Text>
          ))}
        </View>
        {!token ? (
          <Button title="Sign in to play" onPress={() => navigation.navigate('Login')} />
        ) : (
          <Button title="Place bet" onPress={placeBetHandler} loading={loading} />
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', marginBottom: spacing.lg },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface800,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  name: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  meta: { color: colors.textMuted, marginTop: spacing.xs },
  fairBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    backgroundColor: colors.greenDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  fair: { color: colors.green, fontWeight: '600', fontSize: 12 },
  card: { marginTop: spacing.md },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  limits: { color: colors.textDim, fontSize: 13, marginBottom: spacing.md },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  quickChip: {
    color: colors.brand400,
    backgroundColor: colors.surface700,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    overflow: 'hidden',
    fontWeight: '600',
  },
});
