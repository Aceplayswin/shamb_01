// Recent big wins — real settled wins across all players. Public and keyless;
// the API masks player names before they leave the server.

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { useBigWins } from '../../../hooks/useBigWins';
import { useTheme } from '../../../hooks/useBranding';
import { useThemedStyles } from '../../useThemedStyles';
import { inr } from '../../../lib/format';
import { radius, spacing, typography } from '../../palettes';
import { Skeleton } from './ui';

const styles = (t) => ({
  wrap: { marginBottom: spacing.xxl },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  title: { ...typography.section, color: t.appFg, flex: 1 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.emerald[400] },
  liveText: { ...typography.caption, color: t.muted },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.07),
    backgroundColor: t.panelA(0.6),
    padding: spacing.md,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.hairline(0.05),
  },
  thumbImage: { width: '100%', height: '100%' },
  meta: { flex: 1, minWidth: 0 },
  user: { fontSize: 13, fontWeight: '700', color: t.appFg },
  game: { ...typography.caption, color: t.muted },
  amount: { fontSize: 14, fontWeight: '800', color: t.emerald[400], textAlign: 'right' },
  multiplier: { ...typography.caption, color: t.muted, textAlign: 'right' },
});

export function BigWins({ limit = 6, title = 'Recent Big Wins' }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const { wins, loading } = useBigWins(limit);

  // Nothing worth showing yet — stay out of the way rather than render an empty
  // shell on a fresh deployment.
  if (!loading && wins.length === 0) return null;

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Icon name="trophy" size={18} color={t.brand[400]} />
        <Text style={s.title}>{title}</Text>
        <View style={s.live}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>Live</Text>
        </View>
      </View>

      <View style={s.list}>
        {loading
          ? [0, 1, 2].map((i) => <Skeleton key={i} height={64} />)
          : wins.map((w) => (
              <View key={w.id} style={s.row}>
                <View style={s.thumb}>
                  {w.thumbnail_url ? (
                    <Image source={{ uri: w.thumbnail_url }} style={s.thumbImage} />
                  ) : (
                    <Icon name="trophy" size={18} color={t.brand[400]} />
                  )}
                </View>
                <View style={s.meta}>
                  <Text numberOfLines={1} style={s.user}>
                    {w.username}
                  </Text>
                  <Text numberOfLines={1} style={s.game}>
                    {w.game_name}
                  </Text>
                </View>
                <View>
                  <Text style={s.amount}>{inr(w.win_amount)}</Text>
                  {w.multiplier ? <Text style={s.multiplier}>{w.multiplier}×</Text> : null}
                </View>
              </View>
            ))}
      </View>
    </View>
  );
}
