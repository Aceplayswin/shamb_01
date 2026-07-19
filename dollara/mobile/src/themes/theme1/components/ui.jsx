// Theme 1 UI kit — the glass/dark language from the web's theme1: translucent
// panels on a near-black ground, hairline borders, amber brand accents.
//
// Everything here is theme-local on purpose. A second theme brings its own kit;
// nothing outside src/themes/theme1 should import from this file.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../hooks/useBranding';
import { useThemedStyles } from '../../useThemedStyles';
import { radius, spacing, typography } from '../../palettes';

/* --------------------------------- layout --------------------------------- */

const screenStyles = (t) => ({
  root: { flex: 1, backgroundColor: t.appBg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  // Ambient glow behind the page, standing in for the web's radial background
  // gradients so the screen never reads as flat black.
  glowTop: {
    position: 'absolute',
    top: -140,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: t.brandA(500, 0.1),
  },
  glowRight: {
    position: 'absolute',
    top: 40,
    right: -120,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: t.brandA(600, 0.07),
  },
});

/** Page container: ambient background + scrolling body. */
export function Screen({ children, scroll = true, contentStyle, refreshControl }) {
  const s = useThemedStyles(screenStyles);
  const body = (
    <>
      <View pointerEvents="none" style={s.glowTop} />
      <View pointerEvents="none" style={s.glowRight} />
      {children}
    </>
  );

  if (!scroll) {
    return <View style={s.root}>{body}</View>;
  }
  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {body}
    </ScrollView>
  );
}

const cardStyles = (t) => ({
  card: {
    borderRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.09),
    backgroundColor: t.panelA(0.75),
    padding: spacing.xl,
    overflow: 'hidden',
  },
  strong: { backgroundColor: t.panelStrong, borderColor: t.hairline(0.12) },
  glow: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: t.brandA(500, 0.1),
  },
});

/** Frosted panel used across cards, sheets and list containers. */
export function Card({ children, style, strong, glow }) {
  const s = useThemedStyles(cardStyles);
  return (
    <View style={[s.card, strong && s.strong, style]}>
      {glow ? <View pointerEvents="none" style={s.glow} /> : null}
      {children}
    </View>
  );
}

/* ---------------------------------- text ---------------------------------- */

const textStyles = (t) => ({
  hero: { ...typography.hero, color: t.appFg },
  title: { ...typography.title, color: t.appFg },
  section: { ...typography.section, color: t.appFg },
  subtitle: { ...typography.subtitle, color: t.appFg },
  body: { ...typography.body, color: t.appFg },
  muted: { ...typography.body, color: t.muted },
  caption: { ...typography.caption, color: t.muted },
  label: { ...typography.label, color: t.muted },
  brand: { color: t.brand[400] },
  danger: { color: t.danger[400] },
  success: { color: t.emerald[400] },
});

export function Title({ children, style }) {
  const s = useThemedStyles(textStyles);
  return <Text style={[s.title, style]}>{children}</Text>;
}

export function SectionTitle({ children, style }) {
  const s = useThemedStyles(textStyles);
  return <Text style={[s.section, style]}>{children}</Text>;
}

export function Body({ children, style }) {
  const s = useThemedStyles(textStyles);
  return <Text style={[s.body, style]}>{children}</Text>;
}

export function Muted({ children, style, numberOfLines }) {
  const s = useThemedStyles(textStyles);
  return (
    <Text numberOfLines={numberOfLines} style={[s.muted, style]}>
      {children}
    </Text>
  );
}

export function Caption({ children, style, numberOfLines }) {
  const s = useThemedStyles(textStyles);
  return (
    <Text numberOfLines={numberOfLines} style={[s.caption, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, style }) {
  const s = useThemedStyles(textStyles);
  return <Text style={[s.label, style]}>{children}</Text>;
}

/** The web's `.text-gradient-gold`. RN can't clip a gradient to glyphs without a
 *  native dependency, so this uses the ramp's mid tone — the color the gradient
 *  reads as at a glance. */
export function GoldText({ children, style }) {
  const t = useTheme();
  return <Text style={[{ color: t.brand[400] }, style]}>{children}</Text>;
}

/* --------------------------------- buttons -------------------------------- */

const buttonStyles = (t) => ({
  base: {
    borderRadius: radius.lg,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primary: {
    backgroundColor: t.brand[500],
    // Stands in for the web's `shadow-glow`.
    shadowColor: t.brand[500],
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  outline: {
    borderWidth: 1,
    borderColor: t.hairline(0.16),
    backgroundColor: 'transparent',
  },
  ghost: { backgroundColor: t.hairline(0.05) },
  danger: { borderWidth: 1, borderColor: t.danger[500] + '4d', backgroundColor: 'transparent' },
  small: { paddingVertical: 10, paddingHorizontal: spacing.lg, borderRadius: radius.md },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  primaryText: { color: t.surface[950], fontSize: 15, fontWeight: '800' },
  outlineText: { color: t.appFg, fontSize: 14, fontWeight: '700' },
  ghostText: { color: t.appFg, fontSize: 14, fontWeight: '700' },
  dangerText: { color: t.danger[400], fontSize: 14, fontWeight: '700' },
  smallText: { fontSize: 13 },
});

const BUTTON_TEXT = {
  primary: 'primaryText',
  outline: 'outlineText',
  ghost: 'ghostText',
  danger: 'dangerText',
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size,
  loading,
  disabled,
  icon,
  iconSet,
  style,
}) {
  const s = useThemedStyles(buttonStyles);
  const t = useTheme();
  const isDisabled = disabled || loading;
  const textStyle = [s[BUTTON_TEXT[variant]], size === 'small' && s.smallText];
  const inkColor = variant === 'primary' ? t.surface[950] : t.appFg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        s.base,
        s[variant],
        size === 'small' && s.small,
        isDisabled && s.disabled,
        pressed && !isDisabled && s.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={inkColor} />
      ) : (
        <>
          {icon ? <Icon name={icon} set={iconSet} size={17} color={inkColor} /> : null}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/* --------------------------------- inputs --------------------------------- */

const inputStyles = (t) => ({
  wrap: { gap: 6 },
  label: { ...typography.body, color: t.muted, fontSize: 13 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    backgroundColor: t.panelA(0.6),
    paddingHorizontal: spacing.lg,
  },
  focused: { borderColor: t.brandA(400, 0.5) },
  input: {
    flex: 1,
    color: t.appFg,
    fontSize: 15,
    paddingVertical: 14,
  },
  hint: { ...typography.caption, color: t.muted },
  error: { ...typography.caption, color: t.danger[400] },
});

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  maxLength,
  hint,
  error,
  editable = true,
  style,
  inputStyle,
  autoFocus,
  onSubmitEditing,
  returnKeyType,
  multiline,
}) {
  const s = useThemedStyles(inputStyles);
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const isPassword = !!secureTextEntry;

  return (
    <View style={[s.wrap, style]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.field, focused && s.focused]}>
        {icon ? <Icon name={icon} size={17} color={t.muted} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.muted}
          secureTextEntry={isPassword && !reveal}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          editable={editable}
          autoFocus={autoFocus}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[s.input, inputStyle]}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setReveal((r) => !r)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
          >
            <Icon name={reveal ? 'eye-off-outline' : 'eye-outline'} size={18} color={t.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

/* ---------------------------------- bits ---------------------------------- */

const bitStyles = (t) => ({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: t.brandA(500, 0.15),
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: t.brand[300] },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.brand[400] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.hairline(0.08) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: 11,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.hairline(0.07) },
  rowLabel: { ...typography.body, color: t.muted, flexShrink: 1 },
  rowValue: { ...typography.body, color: t.appFg, fontWeight: '600', textAlign: 'right' },
  rowStrong: { fontSize: 15, fontWeight: '800', color: t.brand[400] },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxxl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.brandA(500, 0.12),
    marginBottom: spacing.xs,
  },
  emptyTitle: { ...typography.section, color: t.appFg, textAlign: 'center' },
  emptyText: { ...typography.body, color: t.muted, textAlign: 'center' },
  skeleton: { borderRadius: radius.lg, backgroundColor: t.hairline(0.05) },
  pill: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
});

export function Badge({ children, icon, style, textStyle }) {
  const s = useThemedStyles(bitStyles);
  const t = useTheme();
  return (
    <View style={[s.badge, style]}>
      {icon ? <Icon name={icon} size={12} color={t.brand[300]} /> : null}
      <Text style={[s.badgeText, textStyle]}>{children}</Text>
    </View>
  );
}

export function Divider({ style }) {
  const s = useThemedStyles(bitStyles);
  return <View style={[s.divider, style]} />;
}

/** Label/value line used across wallet, review and account panels. */
export function Row({ label, value, strong, last, valueStyle, children }) {
  const s = useThemedStyles(bitStyles);
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <Text style={s.rowLabel}>{label}</Text>
      {children ?? (
        <Text style={[s.rowValue, strong && s.rowStrong, valueStyle]}>{value ?? '—'}</Text>
      )}
    </View>
  );
}

const STATUS_TONES = {
  ok: ['emerald', 400],
  pending: ['amber', 400],
  bad: ['danger', 400],
  info: ['sky', 400],
  neutral: null,
};

export function StatusPill({ status, tone }) {
  const s = useThemedStyles(bitStyles);
  const t = useTheme();
  const v = String(status ?? '').toLowerCase();
  const resolved =
    tone ??
    (['completed', 'success', 'confirmed', 'verified', 'active', 'approved'].includes(v)
      ? 'ok'
      : ['pending', 'processing', 'in_review', 'review'].includes(v)
        ? 'pending'
        : ['failed', 'rejected', 'cancelled', 'forfeited'].includes(v)
          ? 'bad'
          : 'neutral');
  const spec = STATUS_TONES[resolved];
  const color = spec ? t[spec[0]][spec[1]] : t.muted;
  return (
    <View style={[s.pill, { backgroundColor: color + '26' }]}>
      <Text style={[s.pillText, { color }]}>{status ?? '—'}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, text, children }) {
  const s = useThemedStyles(bitStyles);
  const t = useTheme();
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={26} color={t.brand[400]} />
      </View>
      {title ? <Text style={s.emptyTitle}>{title}</Text> : null}
      {text ? <Text style={s.emptyText}>{text}</Text> : null}
      {children}
    </View>
  );
}

export function Skeleton({ height = 80, style }) {
  const s = useThemedStyles(bitStyles);
  return <View style={[s.skeleton, { height }, style]} />;
}

const tileStyles = (t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  tile: {
    width: '47.5%',
    alignItems: 'center',
    gap: 7,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.07),
    backgroundColor: t.hairline(0.02),
  },
  pressed: { borderColor: t.brandA(500, 0.45), backgroundColor: t.hairline(0.05) },
  label: { ...typography.caption, color: t.appFg, fontWeight: '600' },
});

/** Grid of icon shortcuts — the web's quick-links panel. */
export function ActionTiles({ items, onSelect }) {
  const s = useThemedStyles(tileStyles);
  const t = useTheme();
  return (
    <View style={s.grid}>
      {items.map((item) => (
        <Pressable
          key={item.label}
          onPress={() => onSelect(item)}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          style={({ pressed }) => [s.tile, pressed && s.pressed]}
        >
          <Icon name={item.icon} size={21} color={t.brand[400]} />
          <Text style={s.label}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* -------------------------------- stepper --------------------------------- */

const stepperStyles = (t) => ({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xl },
  step: { alignItems: 'center', gap: 6, width: 74 },
  bubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surface[700],
  },
  bubbleActive: { backgroundColor: t.brand[500] },
  bubbleDone: { backgroundColor: t.emerald[500] },
  bubbleText: { fontSize: 12, fontWeight: '800', color: t.muted },
  bubbleInk: { color: t.surface[950] },
  stepLabel: { fontSize: 11, color: t.muted },
  stepLabelActive: { color: t.appFg, fontWeight: '600' },
  line: { flex: 1, height: 1, marginTop: 15, backgroundColor: t.hairline(0.1) },
  lineDone: { backgroundColor: t.emerald[500] + '99' },
});

/** Progress rail for the deposit / withdraw flows. */
export function Stepper({ steps, current }) {
  const s = useThemedStyles(stepperStyles);
  return (
    <View style={s.wrap}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <View style={s.step}>
              <View style={[s.bubble, active && s.bubbleActive, done && s.bubbleDone]}>
                <Text style={[s.bubbleText, (active || done) && s.bubbleInk]}>
                  {done ? '✓' : i + 1}
                </Text>
              </View>
              <Text style={[s.stepLabel, active && s.stepLabelActive]}>{label}</Text>
            </View>
            {i < steps.length - 1 ? <View style={[s.line, done && s.lineDone]} /> : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

/* ------------------------------- screen head ------------------------------- */

const headStyles = (t) => ({
  wrap: { marginBottom: spacing.lg },
  title: { ...typography.title, color: t.appFg },
  sub: { ...typography.body, color: t.muted, marginTop: 3 },
});

/** Page title + optional subtitle, matching the web's `h1 + p` page openers. */
export function ScreenHeader({ title, subtitle, style }) {
  const s = useThemedStyles(headStyles);
  return (
    <View style={[s.wrap, style]}>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
    </View>
  );
}

/** Bottom padding that clears the floating tab bar on scrolling screens. */
export function useTabBarSpacer() {
  const insets = useSafeAreaInsets();
  return { height: 72 + insets.bottom };
}
