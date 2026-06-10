import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors, radius, spacing } from '../theme';

const CATEGORY_ICONS = {
  ai_games: 'sparkles',
  sports: 'football',
  slots: 'diamond',
  live_casino: 'videocam',
  lottery: 'ticket',
  fantasy: 'trophy',
};

export function GameCard({ game, onPress }) {
  const iconName = CATEGORY_ICONS[game.category] ?? 'game-controller';

  return (
    <Pressable
      onPress={() => onPress(game)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.thumb}>
        {game.thumbnail_url ? (
          <Image source={{ uri: game.thumbnail_url }} style={styles.thumbImage} resizeMode="cover" />
        ) : (
          <Icon name={iconName} size={32} color={colors.brand400} />
        )}
        {game.is_provably_fair ? (
          <View style={styles.badge}>
            <Icon name="shield-checkmark" size={10} color={colors.green} />
            <Text style={styles.badgeText}>Fair</Text>
          </View>
        ) : null}
        {game.rtp ? (
          <View style={styles.rtpBadge}>
            <Text style={styles.rtpText}>{game.rtp}%</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {game.name}
      </Text>
      <Text style={styles.provider} numberOfLines={1}>
        {game.provider_name ?? ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: spacing.xs,
    backgroundColor: colors.surface800,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    minWidth: '46%',
    maxWidth: '48%',
  },
  pressed: { opacity: 0.9, borderColor: colors.brand500 },
  thumb: {
    aspectRatio: 16 / 10,
    backgroundColor: colors.surface700,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.greenDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: { color: colors.green, fontSize: 9, fontWeight: '700' },
  rtpBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  rtpText: { color: colors.brand300, fontSize: 9, fontWeight: '700' },
  name: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  provider: {
    color: colors.textDim,
    fontSize: 11,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
