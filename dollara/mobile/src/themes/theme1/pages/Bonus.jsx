// Theme 1 My Bonuses — the player's own awarded bonus ledger and wagering
// progress. Deliberately separate from Promotions, which is the public catalogue
// anyone can browse: this screen is "what I hold", that one is "what I could
// claim".

import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/auth';
import { useTheme } from '../../../hooks/useBranding';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { useThemedStyles } from '../../useThemedStyles';
import { formatDate, inr } from '../../../lib/format';
import { radius, spacing, typography } from '../../palettes';
import { Button, Card, EmptyState, Skeleton, useTabBarSpacer } from '../components/ui';

const SOURCE_LABEL = {
  joining: 'Welcome bonus',
  deposit: 'Deposit bonus',
  referral: 'Referral bonus',
  game: 'Play bonus',
  cashback: 'Cashback',
  promo: 'Promo code',
  manual: 'Special credit',
};

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg },
  content: { padding: spacing.lg },
  intro: { ...typography.body, color: t.muted, marginBottom: spacing.lg },
  tiles: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  tile: { flex: 1, padding: spacing.lg, borderWidth: 1 },
  tileBonus: { borderColor: t.brand[500] + '33' },
  tileReal: { borderColor: t.emerald[500] + '33' },
  tileLabel: { ...typography.label, fontSize: 9 },
  tileValue: { fontSize: 22, fontWeight: '900', color: t.appFg, marginTop: 4 },
  tileHint: { ...typography.caption, color: t.muted, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  activeCount: { ...typography.caption, color: t.muted },
  bonus: { padding: spacing.lg, marginBottom: spacing.md },
  bonusHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  bonusTitle: { fontSize: 15, fontWeight: '700', color: t.appFg },
  bonusSource: { ...typography.caption, color: t.muted, marginTop: 2 },
  bonusAmount: { fontSize: 18, fontWeight: '800', color: t.brand[300], textAlign: 'right' },
  statusPill: {
    alignSelf: 'flex-end',
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 4,
  },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  progress: { marginTop: spacing.lg },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { ...typography.caption, color: t.muted },
  track: { height: 7, borderRadius: 4, backgroundColor: t.hairline(0.07), marginTop: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: t.brand[500] },
  progressNote: { ...typography.caption, color: t.muted, marginTop: 5 },
});

export default function Theme1Bonus({ navigation }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const spacer = useTabBarSpacer();
  const authed = useRequireAuth(navigation);

  const wallet = useAuthStore((st) => st.wallet);
  const refreshSession = useAuthStore((st) => st.refreshSession);
  const [bonuses, setBonuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authed) return undefined;
    let active = true;
    refreshSession();
    api('/api/v1/bonuses/mine')
      .then((data) => active && setBonuses(Array.isArray(data) ? data : []))
      .catch(() => active && setBonuses([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [authed, refreshSession]);

  if (!authed) return null;

  const STATUS_TONE = {
    active: t.emerald[400],
    completed: t.sky[400],
    expired: t.muted,
    forfeited: t.danger[400],
  };

  const activeCount = bonuses.filter((b) => b.status === 'active').length;

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.intro}>Bonus credits you hold and their wagering progress.</Text>

      {/* Bonus vs real money — the distinction that decides what is withdrawable */}
      <View style={s.tiles}>
        <Card style={[s.tile, s.tileBonus]}>
          <Text style={[s.tileLabel, { color: t.brand[300] }]}>BONUS BALANCE</Text>
          <Text style={s.tileValue}>{inr(wallet?.bonus)}</Text>
          <Text style={s.tileHint}>Withdrawable once wagering clears</Text>
        </Card>
        <Card style={[s.tile, s.tileReal]}>
          <Text style={[s.tileLabel, { color: t.emerald[300] }]}>REAL BALANCE</Text>
          <Text style={s.tileValue}>{inr(wallet?.real ?? wallet?.main)}</Text>
          <Text style={s.tileHint}>Yours to withdraw any time</Text>
        </Card>
      </View>

      <View style={s.actions}>
        <Button
          title="Browse promotions"
          icon="sparkles"
          size="small"
          onPress={() => navigation.navigate('promotions')}
        />
        <Text style={s.activeCount}>
          {activeCount} active bonus{activeCount === 1 ? '' : 'es'}
        </Text>
      </View>

      {loading ? (
        <View style={{ gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={110} />
          ))}
        </View>
      ) : bonuses.length === 0 ? (
        <EmptyState
          icon="gift"
          title="No bonuses yet"
          text="Claim an offer from the promotions page to get started."
        />
      ) : (
        bonuses.map((b) => {
          const required = Number(b.wagering_required ?? 0);
          const done = Number(b.wagering_completed ?? 0);
          const pct = required > 0 ? Math.min(100, Math.round((done / required) * 100)) : 100;
          const tone = STATUS_TONE[b.status] ?? t.muted;

          return (
            <Card key={b.id} style={s.bonus}>
              <View style={s.bonusHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.bonusTitle}>
                    {b.title || SOURCE_LABEL[b.source] || 'Bonus'}
                  </Text>
                  <Text style={s.bonusSource}>
                    {SOURCE_LABEL[b.source] ?? b.source}
                    {b.created_at ? ` · ${formatDate(b.created_at)}` : ''}
                  </Text>
                </View>
                <View>
                  <Text style={s.bonusAmount}>{inr(b.amount)}</Text>
                  <View style={[s.statusPill, { backgroundColor: tone + '26' }]}>
                    <Text style={[s.statusText, { color: tone }]}>{b.status}</Text>
                  </View>
                </View>
              </View>

              {required > 0 ? (
                <View style={s.progress}>
                  <View style={s.progressHead}>
                    <Text style={s.progressLabel}>Wagering progress</Text>
                    <Text style={s.progressLabel}>
                      {inr(done)} / {inr(required)}
                    </Text>
                  </View>
                  <View style={s.track}>
                    <View style={[s.fill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={s.progressNote}>
                    {pct}% complete
                    {b.expires_at ? ` · expires ${formatDate(b.expires_at)}` : ''}
                  </Text>
                </View>
              ) : null}
            </Card>
          );
        })
      )}

      <View style={spacer} />
    </ScrollView>
  );
}
