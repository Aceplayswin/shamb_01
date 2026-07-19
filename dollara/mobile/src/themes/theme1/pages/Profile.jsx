// Theme 1 Profile — the account dashboard: balance, recent transactions,
// account details and the shortcuts into everything else.

import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Icon } from '../../../components/Icon';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/auth';
import { useTheme } from '../../../hooks/useBranding';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { useThemedStyles } from '../../useThemedStyles';
import { inr } from '../../../lib/format';
import { radius, spacing, typography } from '../../palettes';
import { ActionTiles, Button, Card, Label, Row, StatusPill, useTabBarSpacer } from '../components/ui';

const CREDIT_TYPES = ['deposit', 'bonus', 'win', 'refund', 'credit'];
const isCredit = (type) => CREDIT_TYPES.includes(String(type).toLowerCase());

const QUICK = [
  { label: 'Deposit', icon: 'arrow-up-circle', to: 'deposit' },
  { label: 'Withdraw', icon: 'arrow-down-circle', to: 'withdraw' },
  { label: 'Bet History', icon: 'dice', to: 'betHistory' },
  { label: 'Promotions', icon: 'gift', to: 'promotions' },
  { label: 'My Bonuses', icon: 'diamond', to: 'bonus' },
  { label: 'Refer & Earn', icon: 'people', to: 'refer' },
  { label: 'Support', icon: 'chatbubbles', to: 'support' },
  { label: 'Get the App', icon: 'phone-portrait', to: 'appDownload' },
];

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg },
  content: { padding: spacing.lg },
  hero: { padding: spacing.xl, marginBottom: spacing.lg },
  heroLabel: { ...typography.body, color: t.muted },
  heroValue: { fontSize: 32, fontWeight: '900', color: t.brand[400], marginTop: 2 },
  heroBonus: { ...typography.caption, color: t.muted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  section: { padding: spacing.xl, marginBottom: spacing.lg },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  tx: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.06),
    backgroundColor: t.hairline(0.02),
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    marginBottom: spacing.sm,
  },
  txIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txType: { ...typography.body, color: t.appFg, textTransform: 'capitalize', flex: 1 },
  txAmount: { ...typography.body, fontWeight: '700' },
  empty: { ...typography.body, color: t.muted, textAlign: 'center', paddingVertical: spacing.xl },
});

export default function Theme1Profile({ navigation }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const spacer = useTabBarSpacer();
  const authed = useRequireAuth(navigation);

  const user = useAuthStore((st) => st.user);
  const wallet = useAuthStore((st) => st.wallet);
  const logout = useAuthStore((st) => st.logout);
  const refreshSession = useAuthStore((st) => st.refreshSession);

  const [txs, setTxs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!authed) return;
    await Promise.all([
      refreshSession(),
      api('/api/v1/wallet/transactions')
        .then((data) => setTxs(Array.isArray(data) ? data : []))
        .catch(() => setTxs([])),
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

  const confirmLogout = () =>
    Alert.alert('Log out', 'Sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'tabs' }] });
        },
      },
    ]);

  if (!authed) return null;

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.brand[400]} />
      }
    >
      <Card glow style={s.hero}>
        <Text style={s.heroLabel}>Available balance</Text>
        <Text style={s.heroValue}>{inr(wallet?.available)}</Text>
        {wallet?.bonus != null ? (
          <Text style={s.heroBonus}>Bonus: {inr(wallet.bonus)}</Text>
        ) : null}
        <View style={s.actions}>
          <Button title="Deposit" style={{ flex: 1 }} onPress={() => navigation.navigate('deposit')} />
          <Button
            title="Withdraw"
            variant="outline"
            style={{ flex: 1 }}
            onPress={() => navigation.navigate('withdraw')}
          />
        </View>
      </Card>

      <Card style={s.section}>
        <Label>Account details</Label>
        <View style={{ marginTop: spacing.md }}>
          <Row label="Full name" value={user?.full_name} />
          <Row label="Username" value={user?.username} />
          <Row label="Phone" value={user?.phone} />
          <Row label="KYC status">
            <StatusPill status={user?.kyc_status} />
          </Row>
          <Row label="Account status" last>
            <StatusPill status={user?.account_status} />
          </Row>
        </View>
      </Card>

      <Card style={s.section}>
        <View style={s.sectionHead}>
          <Label>Recent transactions</Label>
          {txs.length > 10 ? <Text style={{ ...typography.caption, color: t.muted }}>Showing 10</Text> : null}
        </View>
        {txs.length === 0 ? (
          <Text style={s.empty}>No transactions yet</Text>
        ) : (
          txs.slice(0, 10).map((tx) => {
            const credit = isCredit(tx.type);
            const tone = credit ? t.emerald[400] : t.danger[400];
            return (
              <View key={tx.id} style={s.tx}>
                <View style={[s.txIcon, { backgroundColor: tone + '26' }]}>
                  <Icon name={credit ? 'arrow-up' : 'arrow-down'} size={14} color={tone} />
                </View>
                <Text style={s.txType}>{tx.type}</Text>
                <Text style={[s.txAmount, { color: credit ? t.emerald[400] : t.appFg }]}>
                  {credit ? '+' : '−'}
                  {inr(parseFloat(tx.amount))}
                </Text>
                <StatusPill status={tx.status} />
              </View>
            );
          })
        )}
      </Card>

      <Card style={s.section}>
        <Label>Quick links</Label>
        <ActionTiles items={QUICK} onSelect={(q) => navigation.navigate(q.to)} />
      </Card>

      <Button
        title="Settings"
        variant="outline"
        icon="settings-outline"
        onPress={() => navigation.navigate('settings')}
      />
      <Button
        title="Log out"
        variant="danger"
        onPress={confirmLogout}
        style={{ marginTop: spacing.md }}
      />

      <View style={spacer} />
    </ScrollView>
  );
}
