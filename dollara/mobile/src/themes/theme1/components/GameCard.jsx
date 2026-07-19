// Theme 1 game card — the web's 3:4 poster: cover art under a bottom scrim,
// provider kicker over the title, a state chip top-left and an optional rank.

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../hooks/useBranding';
import { useThemedStyles } from '../../useThemedStyles';
import { radius, spacing } from '../../palettes';

export const CARD_WIDTH = 148;
export const CARD_HEIGHT = Math.round(CARD_WIDTH * (4 / 3));

// Per-section accents, mirroring the web's THEMES map.
export const CARD_ACCENTS = {
  sports: 'emerald',
  casino: 'brand',
  trending: 'rose',
  slots: 'brand',
};

const LIVE_CATEGORIES = ['sports', 'virtual_sports'];

const styles = (t) => ({
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.08),
    backgroundColor: t.panel,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  art: { ...StyleSheet.absoluteFillObject },
  // Art placeholder for games with no thumbnail — a tinted wash plus a soft
  // highlight, so a catalog without images still looks composed.
  placeholder: { ...StyleSheet.absoluteFillObject, backgroundColor: t.surface[800] },
  placeholderGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholderIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Scrim keeps the title legible over arbitrary cover art.
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
    backgroundColor: 'rgba(11,15,20,0.82)',
  },
  scrimSoft: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '62%',
    height: '18%',
    backgroundColor: 'rgba(11,15,20,0.35)',
  },
  topRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(11,15,20,0.7)',
  },
  chipDot: { width: 5, height: 5, borderRadius: 2.5 },
  chipText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  rank: { fontSize: 26, fontWeight: '900', color: 'rgba(255,255,255,0.16)' },
  body: { padding: spacing.md, gap: 2 },
  provider: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  name: { fontSize: 13, fontWeight: '800', color: '#fff' },
});

export function GameCard({ game, onPress, accent = 'brand', rank, width = CARD_WIDTH, style }) {
  const s = useThemedStyles(styles);
  const t = useTheme();

  const accentColor = accent === 'brand' ? t.brand[400] : t[accent]?.[400] ?? t.brand[400];
  const isLive = LIVE_CATEGORIES.includes(game.category);
  const showChip = Boolean(game.tag || isLive || game.is_featured);
  const chipText = game.tag ?? (isLive ? 'LIVE' : 'HOT');

  return (
    <Pressable
      onPress={() => onPress?.(game)}
      accessibilityRole="button"
      accessibilityLabel={`Play ${game.name}`}
      style={({ pressed }) => [
        s.card,
        { width, height: Math.round(width * (4 / 3)) },
        pressed && s.pressed,
        style,
      ]}
    >
      {game.thumbnail_url ? (
        <Image source={{ uri: game.thumbnail_url }} style={s.art} resizeMode="cover" />
      ) : (
        <View style={s.placeholder}>
          <View style={[s.placeholderGlow, { backgroundColor: accentColor + '33' }]} />
          <View style={s.placeholderIcon}>
            <Icon name="game-controller" size={34} color={t.hairline(0.13)} />
          </View>
        </View>
      )}

      <View pointerEvents="none" style={s.scrimSoft} />
      <View pointerEvents="none" style={s.scrim} />

      <View style={s.topRow}>
        {showChip ? (
          <View style={s.chip}>
            <View style={[s.chipDot, { backgroundColor: accentColor }]} />
            <Text style={[s.chipText, { color: accentColor }]}>{chipText}</Text>
          </View>
        ) : (
          <View />
        )}
        {rank ? <Text style={s.rank}>{rank}</Text> : null}
      </View>

      <View style={s.body}>
        {game.provider_name ? (
          <Text numberOfLines={1} style={[s.provider, { color: accentColor }]}>
            {game.provider_name.toUpperCase()}
          </Text>
        ) : null}
        <Text numberOfLines={2} style={s.name}>
          {game.name}
        </Text>
      </View>
    </Pressable>
  );
}
