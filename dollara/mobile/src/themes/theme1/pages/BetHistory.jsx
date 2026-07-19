// Theme 1 Bet History — play/session records plus aggregate P&L. Each row
// expands into its round-by-round detail.
//
// A session the provider has not resolved yet reads "Pending", never a loss —
// sportsbook stakes are only a result once the official outcome arrives.

import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { api } from '../../../services/api';
import { useTheme } from '../../../hooks/useBranding';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { useThemedStyles } from '../../useThemedStyles';
import { formatDate, formatTime, inr } from '../../../lib/format';
import { radius, spacing, typography } from '../../palettes';
import { Card, EmptyState, Skeleton, useTabBarSpacer } from '../components/ui';

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg },
  content: { padding: spacing.lg },
  intro: { ...typography.body, color: t.muted, marginBottom: spacing.lg },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  summary: { width: '47.8%', padding: spacing.lg },
  summaryLabel: { ...typography.label, color: t.muted, fontSize: 9 },
  summaryValue: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  summaryHint: { ...typography.caption, color: t.muted, marginTop: 2 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.section, color: t.appFg },
  sectionCount: { ...typography.caption, color: t.muted },

  row: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.07),
    backgroundColor: t.panelA(0.6),
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  rowOpen: { borderColor: t.brandA(400, 0.35) },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowMeta: { flex: 1, minWidth: 0 },
  gameName: { fontSize: 14, fontWeight: '700', color: t.appFg },
  gameDate: { ...typography.caption, color: t.muted, marginTop: 2 },
  resultUp: { fontSize: 14, fontWeight: '800', color: t.emerald[400] },
  resultDown: { fontSize: 14, fontWeight: '800', color: t.danger[400] },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    backgroundColor: t.amber[500] + '26',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingText: { fontSize: 11, fontWeight: '700', color: t.amber[400] },

  stakeRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md },
  stakeItem: { flex: 1 },
  stakeLabel: { ...typography.caption, color: t.muted },
  stakeValue: { ...typography.body, color: t.appFg, fontWeight: '600' },

  detail: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.hairline(0.08),
    gap: spacing.md,
  },
  round: { gap: 3 },
  roundHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roundId: { ...typography.caption, color: t.muted },
  roundTime: { ...typography.caption, color: t.muted },
  roundBody: { flexDirection: 'row', justifyContent: 'space-between' },
  roundStat: { ...typography.caption, color: t.appFg },
  detailNote: { ...typography.caption, color: t.muted },
  error: { ...typography.caption, color: t.danger[400] },
});

export default function Theme1BetHistory({ navigation }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const spacer = useTabBarSpacer();
  const authed = useRequireAuth(navigation);

  const [records, setRecords] = useState([]);
  const [pnl, setPnl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [rounds, setRounds] = useState({}); // session_uid -> { loading, rounds, error }

  useEffect(() => {
    if (!authed) return undefined;
    let active = true;
    Promise.all([
      api('/api/v1/games/history?limit=50').catch(() => ({ records: [] })),
      api('/api/v1/games/pnl').catch(() => null),
    ])
      .then(([hist, p]) => {
        if (!active) return;
        setRecords(Array.isArray(hist?.records) ? hist.records : []);
        setPnl(p);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [authed]);

  const toggle = async (sessionUid) => {
    if (expanded === sessionUid) {
      setExpanded(null);
      return;
    }
    setExpanded(sessionUid);
    // Re-fetch if the last attempt failed, so a transient error is recoverable
    // by collapsing and re-opening the row.
    if (rounds[sessionUid] && !rounds[sessionUid].error) return;

    setRounds((r) => ({ ...r, [sessionUid]: { loading: true, rounds: [] } }));
    try {
      const data = await api(`/api/v1/games/history/${sessionUid}/rounds`);
      setRounds((r) => ({
        ...r,
        [sessionUid]: { loading: false, rounds: data.rounds ?? [] },
      }));
    } catch (e) {
      setRounds((r) => ({
        ...r,
        [sessionUid]: { loading: false, rounds: [], error: e.message },
      }));
    }
  };

  if (!authed) return null;

  const netTone =
    Number(pnl?.profit_loss ?? 0) >= 0 ? t.emerald[400] : t.danger[400];

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.intro}>Your play sessions and results. Tap a row for round details.</Text>

      <View style={s.summaryGrid}>
        <Card style={s.summary}>
          <Text style={s.summaryLabel}>TOTAL STAKED</Text>
          <Text style={[s.summaryValue, { color: t.appFg }]}>{inr(pnl?.total_bet)}</Text>
        </Card>
        <Card style={s.summary}>
          <Text style={s.summaryLabel}>TOTAL WON</Text>
          <Text style={[s.summaryValue, { color: t.appFg }]}>{inr(pnl?.total_win)}</Text>
        </Card>
        <Card style={s.summary}>
          <Text style={s.summaryLabel}>NET P&amp;L</Text>
          <Text style={[s.summaryValue, { color: netTone }]}>{inr(pnl?.profit_loss)}</Text>
        </Card>
        <Card style={s.summary}>
          <Text style={s.summaryLabel}>AWAITING RESULT</Text>
          <Text style={[s.summaryValue, { color: t.amber[400] }]}>{inr(pnl?.pending_amount)}</Text>
          {pnl?.pending_rounds ? (
            <Text style={s.summaryHint}>
              {pnl.pending_rounds} bet{pnl.pending_rounds === 1 ? '' : 's'} open
            </Text>
          ) : null}
        </Card>
      </View>

      <View style={s.sectionRow}>
        <Text style={s.sectionTitle}>Sessions</Text>
        {!loading && records.length > 0 ? (
          <Text style={s.sectionCount}>{records.length} sessions</Text>
        ) : null}
      </View>

      {loading ? (
        <View style={{ gap: spacing.sm }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={78} />
          ))}
        </View>
      ) : records.length === 0 ? (
        <EmptyState icon="dice" title="No bets yet" text="Your play sessions will appear here." />
      ) : (
        records.map((r) => {
          const open = expanded === r.session_uid;
          const detail = rounds[r.session_uid];
          const isPending = r.result === 'pending';
          const up = Number(r.profit_loss) >= 0;

          return (
            <Pressable
              key={r.session_uid}
              onPress={() => toggle(r.session_uid)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              style={[s.row, open && s.rowOpen]}
            >
              <View style={s.rowHead}>
                <View style={s.rowMeta}>
                  <Text numberOfLines={1} style={s.gameName}>
                    {r.game_name}
                  </Text>
                  <Text style={s.gameDate}>
                    {formatDate(r.last_played_at || r.created_at)} · {r.rounds} round
                    {r.rounds === 1 ? '' : 's'}
                    {r.pending_rounds > 0 ? ` · ${r.pending_rounds} open` : ''}
                  </Text>
                </View>
                {isPending ? (
                  <View style={s.pendingPill}>
                    <Icon name="time" size={11} color={t.amber[400]} />
                    <Text style={s.pendingText}>Pending</Text>
                  </View>
                ) : (
                  <Text style={up ? s.resultUp : s.resultDown}>
                    {up ? '+' : '−'}
                    {inr(Math.abs(Number(r.profit_loss)))}
                  </Text>
                )}
                <Icon
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={15}
                  color={t.muted}
                />
              </View>

              <View style={s.stakeRow}>
                <View style={s.stakeItem}>
                  <Text style={s.stakeLabel}>Staked</Text>
                  <Text style={s.stakeValue}>{inr(r.total_bet)}</Text>
                </View>
                <View style={s.stakeItem}>
                  <Text style={s.stakeLabel}>Won</Text>
                  <Text style={s.stakeValue}>{inr(r.total_win)}</Text>
                </View>
              </View>

              {open ? (
                <View style={s.detail}>
                  {!detail || detail.loading ? (
                    <Text style={s.detailNote}>Loading rounds…</Text>
                  ) : detail.error ? (
                    <Text style={s.error}>{detail.error}</Text>
                  ) : detail.rounds.length === 0 ? (
                    <Text style={s.detailNote}>No round details recorded yet.</Text>
                  ) : (
                    detail.rounds.map((rd) => (
                      <View key={rd.id} style={s.round}>
                        <View style={s.roundHead}>
                          <Text style={s.roundId}>#{rd.game_round || rd.serial_number}</Text>
                          <Text style={s.roundTime}>{formatTime(rd.created_at)}</Text>
                        </View>
                        <View style={s.roundBody}>
                          <Text style={s.roundStat}>Stake {inr(rd.bet_amount)}</Text>
                          <Text style={s.roundStat}>Win {inr(rd.win_amount)}</Text>
                          {rd.result === 'pending' ? (
                            <Text style={[s.roundStat, { color: t.amber[400] }]}>Pending</Text>
                          ) : (
                            <Text
                              style={[
                                s.roundStat,
                                { color: rd.profit_loss >= 0 ? t.emerald[400] : t.danger[400] },
                              ]}
                            >
                              {rd.profit_loss >= 0 ? '+' : '−'}
                              {inr(Math.abs(rd.profit_loss))}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </Pressable>
          );
        })
      )}

      <View style={spacer} />
    </ScrollView>
  );
}
