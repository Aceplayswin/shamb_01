// Theme 1 Rules — general terms, fair-play and responsible-gaming rules.
// Static content, public, no auth.

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useThemedStyles } from '../../useThemedStyles';
import { spacing, typography } from '../../palettes';
import { Card, Label, useTabBarSpacer } from '../components/ui';

const SECTIONS = [
  {
    title: 'General',
    items: [
      'You must be 18 years or older and legally permitted to play in your jurisdiction.',
      'Each player may hold only one account. Duplicate accounts may be suspended.',
      'All information provided during registration and KYC must be accurate.',
    ],
  },
  {
    title: 'Deposits & Withdrawals',
    items: [
      'Minimum withdrawal is ₹500. Withdrawals are processed within 2–24 hours.',
      'KYC verification is required before your first withdrawal.',
      'Funds must be wagered at least once before withdrawal.',
    ],
  },
  {
    title: 'Bonuses',
    items: [
      'Bonuses are subject to wagering requirements before they can be withdrawn.',
      'Only one welcome bonus may be claimed per account.',
      'The operator reserves the right to withdraw any bonus in case of abuse.',
    ],
  },
  {
    title: 'Fair Play & Responsible Gaming',
    items: [
      'Any form of collusion, fraud or use of prohibited software is not allowed.',
      'Set deposit and session limits in Settings to play responsibly.',
      'If gambling stops being fun, take a break or self-exclude via support.',
    ],
  },
];

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg },
  content: { padding: spacing.lg },
  intro: { ...typography.body, color: t.muted, marginBottom: spacing.lg },
  section: { padding: spacing.xl, marginBottom: spacing.md },
  item: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.brand[400], marginTop: 7 },
  itemText: { ...typography.body, color: t.appFg, flex: 1, lineHeight: 20 },
  footer: { ...typography.caption, color: t.muted, textAlign: 'center', marginTop: spacing.lg },
});

export default function Theme1Rules() {
  const s = useThemedStyles(styles);
  const spacer = useTabBarSpacer();

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.intro}>
        Please read our platform rules and responsible-gaming guidelines.
      </Text>

      {SECTIONS.map((section) => (
        <Card key={section.title} style={s.section}>
          <Label>{section.title}</Label>
          {section.items.map((item) => (
            <View key={item} style={s.item}>
              <View style={s.dot} />
              <Text style={s.itemText}>{item}</Text>
            </View>
          ))}
        </Card>
      ))}

      <Text style={s.footer}>
        These rules may be updated from time to time. Continued play constitutes acceptance.
      </Text>
      <View style={spacer} />
    </ScrollView>
  );
}
