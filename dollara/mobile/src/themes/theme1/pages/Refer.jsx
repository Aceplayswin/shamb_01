// Theme 1 Refer & Earn.
//
// The code comes from /api/v1/referral, which is the server's own persisted code
// plus how many people it has brought in. (The web page still derives a code
// from the username client-side — that predates this endpoint and drifts from
// what the backend actually credits, so the app asks the server instead.)
//
// Sharing goes through the native share sheet rather than a copy button:
// react-native's Clipboard is deprecated in core, and the share sheet already
// offers Copy alongside WhatsApp/Telegram/SMS on both platforms.

import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { api } from '../../../services/api';
import { useBranding, useTheme } from '../../../hooks/useBranding';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { useThemedStyles } from '../../useThemedStyles';
import { radius, spacing, typography } from '../../palettes';
import { Button, Card, Label, Skeleton, useTabBarSpacer } from '../components/ui';

const STEPS = [
  { icon: '🔗', title: 'Share your code', desc: 'Send your referral code to friends.' },
  { icon: '💰', title: 'They deposit & play', desc: 'Your friend signs up and makes a deposit.' },
  { icon: '🎁', title: 'You both earn', desc: 'Get ₹500 credited once they start playing.' },
];

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg },
  content: { padding: spacing.lg },
  intro: { ...typography.body, color: t.muted, marginBottom: spacing.lg },
  card: { padding: spacing.xl, marginBottom: spacing.lg },
  codeLabel: { ...typography.body, color: t.muted },
  code: { fontSize: 34, fontWeight: '900', color: t.brand[400], letterSpacing: 4, marginTop: 4 },
  message: {
    ...typography.caption,
    color: t.muted,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    backgroundColor: t.surface[700],
    padding: spacing.md,
    marginTop: spacing.xl,
    lineHeight: 18,
  },
  stats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  stat: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.07),
    backgroundColor: t.hairline(0.02),
    padding: spacing.lg,
  },
  statLabel: { ...typography.caption, color: t.muted },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.07),
    backgroundColor: t.hairline(0.02),
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  stepIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.brandA(500, 0.14),
  },
  stepEmoji: { fontSize: 19 },
  stepTitle: { ...typography.body, color: t.appFg, fontWeight: '600' },
  stepDesc: { ...typography.caption, color: t.muted, marginTop: 1 },
});

export default function Theme1Refer({ navigation }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const branding = useBranding();
  const spacer = useTabBarSpacer();
  const authed = useRequireAuth(navigation);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authed) return undefined;
    let active = true;
    api('/api/v1/referral')
      .then((res) => active && setData(res))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [authed]);

  if (!authed) return null;

  const code = data?.referral_code ?? '';
  const brand = branding.product_name || 'us';
  const message = `Join me on ${brand}! Use my referral code ${code} when you sign up.`;

  const share = () =>
    Share.share(
      Platform.OS === 'ios' ? { message } : { message, title: `Join ${brand}` },
    ).catch(() => {});

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.intro}>Earn ₹500 for every friend who joins and plays.</Text>

      <Card glow style={s.card}>
        <Text style={s.codeLabel}>Your referral code</Text>
        {loading ? (
          <Skeleton height={40} style={{ marginTop: spacing.sm }} />
        ) : (
          <Text style={s.code}>{code || '—'}</Text>
        )}

        <Text style={s.message}>{message}</Text>

        <Button
          title="Share invite"
          icon="share-social"
          onPress={share}
          disabled={!code}
          style={{ marginTop: spacing.md }}
        />

        <View style={s.stats}>
          <View style={s.stat}>
            <Text style={s.statLabel}>Friends referred</Text>
            <Text style={[s.statValue, { color: t.appFg }]}>{data?.referred_count ?? 0}</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>Reward per referral</Text>
            <Text style={[s.statValue, { color: t.emerald[400] }]}>₹500</Text>
          </View>
        </View>
      </Card>

      <Card style={s.card}>
        <Label>How it works</Label>
        {STEPS.map((step) => (
          <View key={step.title} style={s.step}>
            <View style={s.stepIcon}>
              <Text style={s.stepEmoji}>{step.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>{step.title}</Text>
              <Text style={s.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={spacer} />
    </ScrollView>
  );
}
