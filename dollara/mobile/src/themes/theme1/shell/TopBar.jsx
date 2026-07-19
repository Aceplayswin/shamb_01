// Theme 1 top bar — the web header's mobile form: brand, search, wallet pill,
// account. Rendered by react-navigation as the header for every screen.

import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../components/Icon';
import { useBranding, useTheme } from '../../../hooks/useBranding';
import { useAuthStore } from '../../../store/auth';
import { useThemedStyles } from '../../useThemedStyles';
import { inr } from '../../../lib/format';
import { radius, spacing } from '../../palettes';

const styles = (t) => ({
  wrap: {
    backgroundColor: t.rail,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.hairline(0.07),
  },
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  logo: { width: 32, height: 32, borderRadius: radius.md },
  logoFallback: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 17, fontWeight: '900', color: t.appFg, flexShrink: 1 },
  backBtn: { paddingRight: 2, paddingVertical: 4 },
  screenTitle: { fontSize: 16, fontWeight: '800', color: t.appFg, flexShrink: 1 },
  spacer: { flex: 1 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.1),
    backgroundColor: t.panelA(0.6),
  },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.1),
    backgroundColor: t.panelA(0.6),
    paddingLeft: 10,
    paddingRight: 3,
    paddingVertical: 3,
  },
  walletText: { fontSize: 13, fontWeight: '800', color: t.appFg },
  plus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.brand[500],
  },
  loginBtn: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    backgroundColor: t.brand[500],
  },
  loginText: { fontSize: 13, fontWeight: '800', color: t.surface[950] },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    backgroundColor: t.panelA(0.6),
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, color: t.appFg, fontSize: 14, paddingVertical: 9 },
  cancel: { fontSize: 13, fontWeight: '700', color: t.brand[400] },
});

export function TopBar({ navigation, route, options, back }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const branding = useBranding();
  const token = useAuthStore((st) => st.token);
  const wallet = useAuthStore((st) => st.wallet);

  const [searching, setSearching] = useState(false);
  const [term, setTerm] = useState('');
  const inputRef = useRef(null);

  const title = options?.title;
  const isRoot = !back;

  // Debounced search — pushes the query into Home, which renders the results,
  // mirroring how the web puts search results on the home route via ?q=.
  useEffect(() => {
    if (!searching) return undefined;
    const timer = setTimeout(() => {
      navigation.navigate('home', { q: term.trim() || undefined });
    }, 300);
    return () => clearTimeout(timer);
  }, [term, searching, navigation]);

  // Show the player's real balance, NOT `available`. A pending withdrawal only
  // holds funds — nothing is debited until an admin approves it — so netting the
  // hold off here would read as though the money had already gone.
  const balance = wallet?.main ?? wallet?.real ?? 0;

  const closeSearch = () => {
    setSearching(false);
    setTerm('');
    navigation.setParams?.({ q: undefined });
  };

  return (
    <View style={[s.wrap, { paddingTop: insets.top }]}>
      <View style={s.bar}>
        {back ? (
          <Pressable
            onPress={navigation.goBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={s.backBtn}
          >
            <Icon name="chevron-back" size={24} color={t.appFg} />
          </Pressable>
        ) : null}

        {isRoot ? (
          <Pressable
            style={s.brand}
            onPress={() => navigation.navigate('home')}
            accessibilityRole="button"
            accessibilityLabel="Home"
          >
            {branding.logo_url ? (
              <Image source={{ uri: branding.logo_url }} style={s.logo} resizeMode="contain" />
            ) : (
              <View style={[s.logoFallback, { backgroundColor: branding.theme_color }]}>
                <Icon name="sparkles" size={16} color={t.surface[950]} />
              </View>
            )}
            <Text numberOfLines={1} style={s.brandName}>
              {branding.product_name}
            </Text>
          </Pressable>
        ) : (
          <Text numberOfLines={1} style={s.screenTitle}>
            {title}
          </Text>
        )}

        <View style={s.spacer} />

        {isRoot ? (
          <Pressable
            onPress={() => {
              setSearching(true);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            accessibilityRole="button"
            accessibilityLabel="Search games"
            style={s.iconBtn}
          >
            <Icon name="search" size={17} color={t.appFg} />
          </Pressable>
        ) : null}

        {token ? (
          <Pressable
            style={s.wallet}
            onPress={() => navigation.navigate('wallet')}
            accessibilityRole="button"
            accessibilityLabel="Wallet"
          >
            <Icon name="wallet" size={14} color={t.brand[400]} />
            <Text style={s.walletText}>{inr(balance, { decimals: 2 })}</Text>
            <Pressable
              onPress={() => navigation.navigate('deposit')}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Deposit"
              style={s.plus}
            >
              <Icon name="add" size={17} color={t.surface[950]} />
            </Pressable>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => navigation.navigate('login')}
            accessibilityRole="button"
            style={s.loginBtn}
          >
            <Text style={s.loginText}>Log in</Text>
          </Pressable>
        )}
      </View>

      {searching ? (
        <View style={s.searchRow}>
          <View style={s.searchField}>
            <Icon name="search" size={16} color={t.muted} />
            <TextInput
              ref={inputRef}
              value={term}
              onChangeText={setTerm}
              placeholder="Search games, sports & providers…"
              placeholderTextColor={t.muted}
              autoCorrect={false}
              returnKeyType="search"
              style={s.searchInput}
            />
            {term ? (
              <Pressable onPress={() => setTerm('')} hitSlop={8} accessibilityLabel="Clear search">
                <Icon name="close-circle" size={16} color={t.muted} />
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={closeSearch} accessibilityRole="button">
            <Text style={s.cancel}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
