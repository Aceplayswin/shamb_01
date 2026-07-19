// Theme 1 Onboarding — the three-card post-registration walkthrough.

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../hooks/useBranding';
import { useThemedStyles } from '../../useThemedStyles';
import { spacing, typography } from '../../palettes';
import { Button, Card } from '../components/ui';

const GAME_TYPES = ['Sports Betting', 'Live Casino', 'Slots', 'Lottery', 'AI Games', 'Fantasy Games'];
const BET_RANGES = ['₹100-500', '₹500-2000', '₹2000-10000', '₹10000+'];

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg },
  content: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxxl },
  card: { padding: spacing.xl, alignItems: 'center' },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.brandA(500, 0.14),
    marginBottom: spacing.lg,
  },
  title: { ...typography.title, color: t.appFg, textAlign: 'center' },
  text: { ...typography.body, color: t.muted, textAlign: 'center', marginTop: spacing.md, lineHeight: 20 },
  bonus: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: t.brandA(500, 0.14),
    padding: spacing.lg,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  bonusTitle: { fontSize: 15, fontWeight: '800', color: t.brand[300] },
  bonusText: { ...typography.caption, color: t.muted, marginTop: 4 },
  actions: { width: '100%', marginTop: spacing.xl, gap: spacing.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.xl },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.hairline(0.18) },
  dotActive: { width: 18, backgroundColor: t.brand[400] },

  prefTitle: { ...typography.title, color: t.appFg, alignSelf: 'flex-start' },
  fieldLabel: { ...typography.body, color: t.muted, fontSize: 13, marginBottom: spacing.sm, marginTop: spacing.lg, alignSelf: 'flex-start' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignSelf: 'stretch' },
  option: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    backgroundColor: t.panelA(0.6),
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
  },
  optionActive: { borderColor: t.brand[500], backgroundColor: t.brandA(500, 0.14) },
  optionText: { fontSize: 12, fontWeight: '700', color: t.muted },
  optionTextActive: { color: t.brand[300] },
});

const SLIDES = [
  {
    icon: 'shield-checkmark',
    title: 'Secure your account',
    text: 'Set a strong password and enable two-factor authentication from Settings to keep your balance safe.',
  },
  {
    icon: 'gift',
    title: 'Welcome!',
    text: 'Explore AI Games, Sports and the live casino lobby.',
    bonus: true,
  },
];

export default function Theme1Onboarding({ navigation }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const [step, setStep] = useState(0);
  const [gameType, setGameType] = useState('');
  const [betRange, setBetRange] = useState('');

  const finish = () => navigation.reset({ index: 0, routes: [{ name: 'tabs' }] });

  // Final step: quick preferences.
  if (step === SLIDES.length) {
    return (
      <ScrollView style={s.page} contentContainerStyle={s.content}>
        <Card style={s.card}>
          <Text style={s.prefTitle}>Quick preferences</Text>

          <Text style={s.fieldLabel}>Preferred game type</Text>
          <View style={s.options}>
            {GAME_TYPES.map((g) => {
              const active = gameType === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => setGameType(active ? '' : g)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[s.option, active && s.optionActive]}
                >
                  <Text style={[s.optionText, active && s.optionTextActive]}>{g}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={s.fieldLabel}>Typical highest bet</Text>
          <View style={s.options}>
            {BET_RANGES.map((r) => {
              const active = betRange === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setBetRange(active ? '' : r)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[s.option, active && s.optionActive]}
                >
                  <Text style={[s.optionText, active && s.optionTextActive]}>{r}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={s.actions}>
            <Button title="Save & continue" onPress={finish} />
            <Button title="Skip" variant="ghost" onPress={finish} />
          </View>
        </Card>
      </ScrollView>
    );
  }

  const slide = SLIDES[step];

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Card style={s.card}>
        <View style={s.iconRing}>
          <Icon name={slide.icon} size={30} color={t.brand[400]} />
        </View>
        <Text style={s.title}>{slide.title}</Text>
        <Text style={s.text}>{slide.text}</Text>

        {slide.bonus ? (
          <View style={s.bonus}>
            <Text style={s.bonusTitle}>₹100 FREE added to your wallet!</Text>
            <Text style={s.bonusText}>Ready to play right away</Text>
          </View>
        ) : null}

        <View style={s.actions}>
          <Button title="Next" onPress={() => setStep(step + 1)} />
          <Button title="Skip" variant="ghost" onPress={finish} />
        </View>

        <View style={s.dots}>
          {[...SLIDES, null].map((_, i) => (
            <View key={i} style={[s.dot, i === step && s.dotActive]} />
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}
