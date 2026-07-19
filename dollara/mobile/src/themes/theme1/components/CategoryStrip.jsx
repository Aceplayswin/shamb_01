// The web rail's category list, laid out horizontally for a phone. Same
// destinations, same order: broad categories first, then the specific table and
// live games that deep-link into a filtered category.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../hooks/useBranding';
import { useThemedStyles } from '../../useThemedStyles';
import { radius, spacing, typography } from '../../palettes';

// `q` narrows a broad category to a specific game family, exactly as the web's
// `?q=` links do.
const CATEGORIES = [
  { label: 'Lottery', icon: 'ticket', color: 'rose', category: 'lottery' },
  { label: 'Crash', icon: 'rocket', color: 'brand', category: 'ai' },
  { label: 'Roulette', icon: 'radio-button-on', color: 'danger', category: 'live-casino', q: 'roulette' },
  { label: 'Blackjack', icon: 'albums', color: 'sky', category: 'live-casino', q: 'blackjack' },
  { label: 'Baccarat', icon: 'diamond', color: 'sky', category: 'live-casino', q: 'baccarat' },
  { label: 'Dragon', icon: 'flame', color: 'brand', category: 'slots', q: 'dragon' },
  { label: 'Teen Patti', icon: 'layers', color: 'amber', category: 'live-casino', q: 'teen' },
  { label: 'Poker', icon: 'apps', color: 'brand', category: 'live-casino', q: 'poker' },
  { label: 'Shows', icon: 'tv', color: 'emerald', category: 'live-casino', q: 'show' },
  { label: 'Slots', icon: 'apps-outline', color: 'brand', category: 'slots' },
  { label: 'Fantasy', icon: 'american-football', color: 'emerald', category: 'fantasy' },
];

const styles = (t) => ({
  wrap: { marginBottom: spacing.xxl },
  heading: { ...typography.label, color: t.muted, marginBottom: spacing.md },
  list: { gap: spacing.md, paddingRight: spacing.lg },
  item: { alignItems: 'center', gap: 6, width: 62 },
  bubble: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.09),
    backgroundColor: t.panelA(0.7),
  },
  label: { fontSize: 10, fontWeight: '600', color: t.muted, textAlign: 'center' },
});

export function CategoryStrip({ onSelect }) {
  const s = useThemedStyles(styles);
  const t = useTheme();

  return (
    <View style={s.wrap}>
      <Text style={s.heading}>Categories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.label}
            onPress={() => onSelect?.(c)}
            accessibilityRole="button"
            accessibilityLabel={c.label}
            style={({ pressed }) => [s.item, pressed && { opacity: 0.7 }]}
          >
            <View style={s.bubble}>
              <Icon
                name={c.icon}
                size={22}
                color={c.color === 'brand' ? t.brand[400] : t[c.color]?.[400] ?? t.brand[400]}
              />
            </View>
            <Text numberOfLines={1} style={s.label}>
              {c.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
