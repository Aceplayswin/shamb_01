// Theme 1 App install — serves the Android APK the product admin publishes from
// /admin/app. The download button points at /api/v1/app/apk, a stable redirect,
// so replacing the build does not break links or printed QR codes.
//
// On the app itself this doubles as a "share the app" surface: a player already
// holding the APK can pass the link to a friend.

import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { api } from '../../../services/api';
import { API_URL } from '../../../config';
import { useBranding, useTheme } from '../../../hooks/useBranding';
import { useThemedStyles } from '../../useThemedStyles';
import { spacing, typography } from '../../palettes';
import { Badge, Button, Card, Label, Row, Skeleton, useTabBarSpacer } from '../components/ui';

const PERKS = [
  'Faster launches and smoother live tables',
  'Instant alerts for deposits, withdrawals and bet results',
  'One-tap login — no re-entering your number',
  'Play anywhere without keeping a browser tab open',
];

const STEPS = [
  'Tap “Download APK” above and wait for the file to finish.',
  'Open it. If Android asks, allow installs from this source — that prompt is normal for apps outside the Play Store.',
  'Tap Install, then open the app and sign in as usual.',
];

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg },
  content: { padding: spacing.lg },
  card: { padding: spacing.xl, marginBottom: spacing.lg },
  title: { fontSize: 24, fontWeight: '900', color: t.appFg, marginTop: spacing.lg },
  sub: { ...typography.body, color: t.muted, marginTop: 6, lineHeight: 20 },
  meta: { marginTop: spacing.xl },
  notes: {
    ...typography.caption,
    color: t.muted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.hairline(0.07),
    backgroundColor: t.hairline(0.02),
    padding: spacing.md,
    marginTop: spacing.lg,
    lineHeight: 18,
  },
  unavailable: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    backgroundColor: t.hairline(0.02),
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  unavailableTitle: { ...typography.body, color: t.appFg, fontWeight: '700' },
  unavailableText: { ...typography.body, color: t.muted, marginTop: 4, lineHeight: 20 },
  perk: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  perkText: { ...typography.body, color: t.appFg, flex: 1, lineHeight: 20 },
  step: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.brandA(500, 0.15),
  },
  stepNumText: { fontSize: 11, fontWeight: '800', color: t.brand[300] },
  stepText: { ...typography.body, color: t.appFg, flex: 1, lineHeight: 20 },
});

export default function Theme1AppDownload() {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const branding = useBranding();
  const spacer = useTabBarSpacer();

  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api('/api/v1/app/download')
      .then((data) => active && setConfig(data))
      .catch(() => active && setConfig(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const available = config?.available;
  const downloadUrl = `${API_URL}/api/v1/app/apk`;

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Card glow style={s.card}>
        <Badge icon="phone-portrait">ANDROID APP</Badge>
        <Text style={s.title}>Get the {branding.product_name} app</Text>
        <Text style={s.sub}>
          Install the Android app for the fastest way to play, deposit and track your bets.
        </Text>

        {loading ? (
          <Skeleton height={48} style={{ marginTop: spacing.xl }} />
        ) : available ? (
          <>
            <Button
              title="Download APK"
              icon="download"
              onPress={() => Linking.openURL(downloadUrl).catch(() => {})}
              style={{ marginTop: spacing.xl }}
            />
            <View style={s.meta}>
              {config.version ? <Row label="Version" value={config.version} /> : null}
              {config.size_mb ? <Row label="Size" value={`${config.size_mb} MB`} /> : null}
              {config.min_android ? (
                <Row label="Requires" value={`Android ${config.min_android}+`} last />
              ) : null}
            </View>
            {config.release_notes ? <Text style={s.notes}>{config.release_notes}</Text> : null}
            {config.ios_url ? (
              <Button
                title="Install for iOS"
                variant="outline"
                icon="logo-apple"
                onPress={() => Linking.openURL(config.ios_url).catch(() => {})}
                style={{ marginTop: spacing.md }}
              />
            ) : null}
          </>
        ) : (
          <View style={s.unavailable}>
            <Text style={s.unavailableTitle}>The app is not published yet</Text>
            <Text style={s.unavailableText}>
              It is on the way. In the meantime everything works in your mobile browser.
            </Text>
          </View>
        )}

        <View style={{ marginTop: spacing.xl }}>
          {PERKS.map((perk) => (
            <View key={perk} style={s.perk}>
              <Icon name="checkmark-circle" size={17} color={t.brand[400]} />
              <Text style={s.perkText}>{perk}</Text>
            </View>
          ))}
        </View>
      </Card>

      {available ? (
        <Card style={s.card}>
          <Label>How to install</Label>
          {STEPS.map((step, i) => (
            <View key={step} style={s.step}>
              <View style={s.stepNum}>
                <Text style={s.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <View style={spacer} />
    </ScrollView>
  );
}
