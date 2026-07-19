// A titled, horizontally-scrolling row of game cards — the web's <Section/>.
// The web's ◀ ▶ buttons become a native swipe; the "See all" affordance stays.

import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../hooks/useBranding';
import { useThemedStyles } from '../../useThemedStyles';
import { radius, spacing, typography } from '../../palettes';
import { CARD_WIDTH, GameCard } from './GameCard';

const styles = (t) => ({
  wrap: { marginBottom: spacing.xxl },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.1),
    backgroundColor: t.panel,
  },
  kicker: { ...typography.label, color: t.muted, fontSize: 9 },
  title: { ...typography.section, color: t.appFg },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.1),
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  seeAllText: { fontSize: 12, fontWeight: '700', color: t.fg(0.7) },
  list: { gap: spacing.md, paddingRight: spacing.lg },
});

export function Section({ title, kicker, icon, accent = 'brand', items, onPlay, onSeeAll, ranked }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  if (!items?.length) return null;

  const accentColor = accent === 'brand' ? t.brand[400] : t[accent]?.[400] ?? t.brand[400];

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <View style={s.headLeft}>
          <View style={s.iconBox}>
            <Icon name={icon} size={19} color={accentColor} />
          </View>
          <View style={{ flexShrink: 1 }}>
            {kicker ? <Text style={s.kicker}>{kicker}</Text> : null}
            <Text numberOfLines={1} style={s.title}>
              {title}
            </Text>
          </View>
        </View>
        {onSeeAll ? (
          <Pressable
            onPress={onSeeAll}
            accessibilityRole="button"
            accessibilityLabel={`See all ${title}`}
            style={s.seeAll}
          >
            <Text style={s.seeAllText}>See all</Text>
            <Icon name="arrow-forward" size={13} color={t.fg(0.7)} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => String(item.id ?? item.slug)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.list}
        snapToInterval={CARD_WIDTH + spacing.md}
        decelerationRate="fast"
        renderItem={({ item, index }) => (
          <GameCard
            game={item}
            onPress={onPlay}
            accent={accent}
            rank={ranked ? index + 1 : undefined}
          />
        )}
      />
    </View>
  );
}
