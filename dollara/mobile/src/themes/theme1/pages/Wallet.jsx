// Theme 1 Wallet — top-line balances come off the shared wallet API (hydrated
// into the auth store); the itemised, per-source breakdown (bonuses by type,
// deposits/withdrawals, game play) is fetched from /api/v1/wallet/breakdown.

import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/auth';
import { useTheme } from '../../../hooks/useBranding';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { useThemedStyles } from '../../useThemedStyles';
import { inr } from '../../../lib/format';
import { radius, spacing, typography } from '../../palettes';
import { ActionTiles, Button, Card, Label, Row, useTabBarSpacer } from '../components/ui';

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg },
  content: { padding: spacing.lg },
  hero: { padding: spacing.xl, marginBottom: spacing.lg },
  heroLabel: { ...typography.body, color: t.muted },
  heroValue: { fontSize: 38, fontWeight: '900', color: t.brand[400], marginTop: 2 },
  tiles: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  tile: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg },
  tileReal: { borderColor: t.emerald[500] + '40', backgroundColor: t.emerald[500] + '12' },
  tileBonus: { borderColor: t.brand[500] + '40', backgroundColor: t.brand[500] + '12' },
  tileLabel: { ...typography.label, fontSize: 9 },
  tileValue: { fontSize: 19, fontWeight: '800', color: t.appFg, marginTop: 4 },
  tileHint: { fontSize: 10, marginTop: 2 },
  hold: {
    ...typography.caption,
    color: t.amber[300],
    backgroundColor: t.amber[500] + '1a',
    borderWidth: 1,
    borderColor: t.amber[500] + '33',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    lineHeight: 17,
  },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  action: { flex: 1 },
  statRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  stat: { flex: 1, padding: spacing.lg },
  statLabel: { ...typography.label, color: t.muted, fontSize: 9 },
  statValue: { fontSize: 16, fontWeight: '800', color: t.appFg, marginTop: 4 },
  section: { padding: spacing.xl, marginBottom: spacing.lg },
  subhead: { ...typography.label, color: t.muted, marginTop: spacing.xl, marginBottom: 2 },
});

export default function Theme1Wallet({ navigation }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const spacer = useTabBarSpacer();
  const authed = useRequireAuth(navigation);

  const wallet = useAuthStore((st) => st.wallet);
  const refreshSession = useAuthStore((st) => st.refreshSession);
  const [breakdown, setBreakdown] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!authed) return;
    await Promise.all([
      refreshSession(),
      api('/api/v1/wallet/breakdown')
        .then(setBreakdown)
        .catch(() => setBreakdown(null)),
    ]);
  }, [authed, refreshSession]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!authed) return null;

  const real = wallet?.real ?? wallet?.main ?? 0;
  const bonus = wallet?.bonus ?? 0;
  const held = wallet?.pendingWithdrawal ?? wallet?.locked ?? 0;
  const bonuses = (breakdown?.bonuses ?? []).filter((b) => b.amount > 0);
  const game = breakdown?.gamePlay;

  const QUICK = [
    { label: 'Deposit', icon: 'arrow-up-circle', to: 'deposit' },
    { label: 'Withdraw', icon: 'arrow-down-circle', to: 'withdraw' },
    { label: 'Bet History', icon: 'dice', to: 'betHistory' },
    { label: 'Promotions', icon: 'gift', to: 'promotions' },
    { label: 'My Bonuses', icon: 'diamond', to: 'bonus' },
    { label: 'Get the App', icon: 'phone-portrait', to: 'appDownload' },
  ];

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.brand[400]} />
      }
    >
      {/* Real and bonus money are tracked separately: only real balance is
          withdrawable, bonus must clear wagering first. */}
      <Card glow style={s.hero}>
        <Text style={s.heroLabel}>Total balance</Text>
        <Text style={s.heroValue}>{inr(real + bonus)}</Text>

        <View style={s.tiles}>
          <View style={[s.tile, s.tileReal]}>
            <Text style={[s.tileLabel, { color: t.emerald[300] }]}>REAL BALANCE</Text>
            <Text style={s.tileValue}>{inr(real)}</Text>
            <Text style={[s.tileHint, { color: t.emerald[300] }]}>Withdrawable cash</Text>
          </View>
          <View style={[s.tile, s.tileBonus]}>
            <Text style={[s.tileLabel, { color: t.brand[300] }]}>BONUS BALANCE</Text>
            <Text style={s.tileValue}>{inr(bonus)}</Text>
            <Text style={[s.tileHint, { color: t.brand[300] }]}>Play-through required</Text>
          </View>
        </View>

        {held > 0 ? (
          <Text style={s.hold}>
            {inr(held)} is on hold for a withdrawal awaiting approval. It stays in your balance
            until an admin approves the payout.
          </Text>
        ) : null}

        <View style={s.actions}>
          <Button title="Deposit" style={s.action} onPress={() => navigation.navigate('deposit')} />
          <Button
            title="Withdraw"
            variant="outline"
            style={s.action}
            onPress={() => navigation.navigate('withdraw')}
          />
        </View>
      </Card>

      <View style={s.statRow}>
        <Card style={s.stat}>
          <Text style={s.statLabel}>AVAILABLE</Text>
          <Text style={s.statValue}>{inr(wallet?.available)}</Text>
        </Card>
        <Card style={s.stat}>
          <Text style={s.statLabel}>ON HOLD</Text>
          <Text style={s.statValue}>{inr(held)}</Text>
        </Card>
        <Card style={s.stat}>
          <Text style={s.statLabel}>EXPOSURE</Text>
          <Text style={s.statValue}>{inr(wallet?.exposure)}</Text>
        </Card>
      </View>

      <Card style={s.section}>
        <Label>Balance details</Label>
        <View style={{ marginTop: spacing.md }}>
          <Row label="Real balance" value={inr(real)} strong />
          <Row label="Bonus balance" value={inr(bonus)} />
          <Row label="Available to play" value={inr(wallet?.available)} />
          <Row label="On hold (awaiting approval)" value={inr(held)} />
          <Row label="Exposure (open bets)" value={inr(wallet?.exposure)} last />
        </View>

        <Text style={s.subhead}>Bonuses</Text>
        <View>
          {bonuses.length > 0 ? (
            bonuses.map((b, i) => (
              <Row
                key={b.source}
                label={b.label}
                value={inr(b.amount)}
                last={i === bonuses.length - 1 && !breakdown?.bonusTotal}
              />
            ))
          ) : (
            <Row label="No bonus amounts yet" value={inr(0)} last={!breakdown?.bonusTotal} />
          )}
          {breakdown?.bonusTotal > 0 ? (
            <Row label="Total bonus" value={inr(breakdown.bonusTotal)} strong last />
          ) : null}
        </View>

        {game ? (
          <>
            <Text style={s.subhead}>Game play</Text>
            <View>
              <Row label="Total staked" value={inr(game.staked)} />
              <Row label="Total won" value={inr(game.won)} />
              <Row
                label="Net profit / loss"
                value={`${Number(game.net) > 0 ? '+' : ''}${inr(game.net)}`}
                valueStyle={{
                  color:
                    Number(game.net) > 0
                      ? t.emerald[400]
                      : Number(game.net) < 0
                        ? t.danger[400]
                        : t.appFg,
                }}
                last
              />
            </View>
          </>
        ) : null}

        <Text style={s.subhead}>Deposits &amp; withdrawals</Text>
        <View>
          <Row label="Total deposited" value={inr(breakdown?.deposits)} />
          <Row label="Total withdrawn" value={inr(breakdown?.withdrawals)} last />
        </View>
      </Card>

      <Card style={s.section}>
        <Label>Quick links</Label>
        <ActionTiles items={QUICK} onSelect={(q) => navigation.navigate(q.to)} />
      </Card>

      <View style={spacer} />
    </ScrollView>
  );
}
