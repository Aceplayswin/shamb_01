// Theme 1 Home — the web homepage's mobile form: hero (admin banners when set,
// otherwise the welcome-offer panel), latest ticker, category strip, provider
// filter chips, the four game rails, live big wins, feature grid and FAQ.
//
// Search is driven from the top bar, which pushes `route.params.q` here — the
// same "results render on home" behaviour the web gets from `?q=`.

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../../components/Icon';
import { useBranding, useTheme } from '../../../hooks/useBranding';
import { useAuthStore } from '../../../store/auth';
import { useBanners } from '../../../hooks/useBanners';
import { useGameCatalog } from '../../../hooks/useGameCatalog';
import { useGameSearch } from '../../../hooks/useGameSearch';
import { filterByCategory, filterByProvider, filterFeatured } from '../../../lib/gameRoutes';
import { useThemedStyles } from '../../useThemedStyles';
import { radius, spacing, typography } from '../../palettes';
import { BannerCarousel } from '../components/BannerCarousel';
import { BigWins } from '../components/BigWins';
import { CategoryStrip } from '../components/CategoryStrip';
import { GameCard } from '../components/GameCard';
import { Section } from '../components/Section';
import { Badge, Button, Card, EmptyState, Muted, Skeleton, useTabBarSpacer } from '../components/ui';

const PARTNERS = ['Caleta', 'CQ9', 'Endorphina', 'Evolution', 'Evoplay', 'PG Soft', 'Pragmatic', 'Saba'];

const TICKER = [
  '🎰 Live casino games launching in 7 days',
  '🏆 Mega slots tournament starts in 10 days',
  '💸 Weekly cashback v2.0 releasing soon',
];

const FEATURES = [
  { title: 'Fast Withdrawals', desc: 'Cash out in under 5 minutes', icon: 'time' },
  { title: 'Instant Deposits', desc: 'UPI, cards & wallets', icon: 'card' },
  { title: '1-Click Signup', desc: 'No paperwork to start', icon: 'person-add' },
  { title: 'Provably Fair', desc: 'Certified RNG & licensing', icon: 'shield-checkmark' },
];

const styles = (t) => ({
  hero: { padding: spacing.xl, marginBottom: spacing.xxl },
  heroTitle: { fontSize: 30, fontWeight: '900', color: t.appFg, marginTop: spacing.lg, lineHeight: 34 },
  heroGold: { color: t.brand[400] },
  heroText: { ...typography.body, color: t.muted, marginTop: spacing.md },
  heroStrong: { color: t.brand[300], fontWeight: '700' },
  heroCta: { marginTop: spacing.xl },
  heroNote: { ...typography.caption, color: t.muted, textAlign: 'center', marginTop: spacing.md },

  statRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xxl },
  stat: { flex: 1, padding: spacing.lg },
  statValue: { fontSize: 21, fontWeight: '900', color: t.appFg, marginTop: spacing.sm },
  statLabel: { ...typography.label, color: t.muted, fontSize: 9, marginTop: 2 },

  ticker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.07),
    backgroundColor: t.panelA(0.6),
    overflow: 'hidden',
    marginBottom: spacing.xxl,
  },
  tickerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.md,
    backgroundColor: t.brand[500],
  },
  tickerTagText: { fontSize: 10, fontWeight: '900', color: t.surface[950] },
  tickerList: { alignItems: 'center', gap: spacing.xl, paddingHorizontal: spacing.lg },
  tickerItem: { ...typography.caption, color: t.fg(0.8), paddingVertical: 11 },

  heading: { ...typography.label, color: t.muted },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  clearText: { fontSize: 11, fontWeight: '800', color: t.brand[400] },
  chips: { gap: spacing.sm, paddingRight: spacing.lg, marginBottom: spacing.xxl },
  chip: {
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.1),
    backgroundColor: t.panelA(0.6),
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: t.brand[500], borderColor: t.brand[500] },
  chipText: { fontSize: 11, fontWeight: '800', color: t.fg(0.7) },
  chipTextActive: { color: t.surface[950] },

  resultsTitle: { ...typography.section, color: t.appFg, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },

  sectionHead: { marginBottom: spacing.lg },
  sectionKicker: { ...typography.label, color: t.muted, fontSize: 9 },
  sectionTitle: { ...typography.title, color: t.appFg, marginTop: 2 },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xxl },
  feature: { width: '47.8%', padding: spacing.lg },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surface[700],
  },
  featureTitle: { fontSize: 14, fontWeight: '800', color: t.appFg, marginTop: spacing.md },
  featureDesc: { ...typography.caption, color: t.muted, marginTop: 2 },

  partnerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xxl },
  partner: {
    width: '31.5%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.06),
    backgroundColor: t.panelA(0.4),
  },
  partnerName: { fontSize: 12, fontWeight: '700', color: t.muted },

  faqItem: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.hairline(0.07),
    backgroundColor: t.panelA(0.6),
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  faqOpen: { borderColor: t.brandA(400, 0.4), backgroundColor: t.panel },
  faqHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  faqDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.hairline(0.25) },
  faqDotOpen: { backgroundColor: t.brand[400] },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', color: t.appFg },
  faqA: { ...typography.body, color: t.muted, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingLeft: 35, lineHeight: 20 },

  centered: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  error: { ...typography.body, color: t.danger[400], textAlign: 'center' },
});

export default function Theme1Home({ navigation, route }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const branding = useBranding();
  const token = useAuthStore((st) => st.token);
  const refreshSession = useAuthStore((st) => st.refreshSession);
  const spacer = useTabBarSpacer();

  const searchQuery = (route.params?.q ?? '').trim();
  const { banners } = useBanners();
  const { games, loading, error } = useGameCatalog();
  const { results: searchResults, loading: searching } = useGameSearch(searchQuery);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const providers = useMemo(
    () => [...new Set(games.map((g) => g.provider_name).filter(Boolean))].sort(),
    [games],
  );

  const liveSports = useMemo(
    () => filterByCategory(games, ['sports', 'virtual_sports']).slice(0, 10),
    [games],
  );
  const casinoGames = useMemo(
    () => filterByCategory(games, ['live_casino', 'ai_games']).slice(0, 10),
    [games],
  );
  const trendingGames = useMemo(() => filterFeatured(games, 10), [games]);
  const trendingSlots = useMemo(() => filterByCategory(games, 'slots').slice(0, 10), [games]);

  const openGame = useCallback(
    (game) => {
      if (game?.slug) navigation.navigate('play', { slug: game.slug, name: game.name });
    },
    [navigation],
  );

  const openCategory = useCallback(
    (c) => navigation.navigate('games', { category: c.category, q: c.q, title: c.label }),
    [navigation],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (token) await refreshSession();
    setRefreshing(false);
  }, [token, refreshSession]);

  const isSearching = searchQuery !== '';
  const isFiltering = isSearching || selectedProvider !== null;

  // When searching, filter the live API results; otherwise the provider chips
  // filter the cached catalog on-device.
  const filteredGames = useMemo(() => {
    if (isSearching) {
      return selectedProvider ? filterByProvider(searchResults, selectedProvider) : searchResults;
    }
    if (selectedProvider) return filterByProvider(games, selectedProvider);
    return [];
  }, [isSearching, searchResults, selectedProvider, games]);

  const faqs = [
    {
      q: `Why is ${branding.product_name || 'this platform'} one of the best betting sites in India?`,
      a: 'A trusted, licensed platform built around fast payouts, fair games and 24/7 human support — without the clutter of typical betting sites.',
    },
    {
      q: 'Is online betting legal in India?',
      a: 'There are no federal laws explicitly prohibiting online betting across most of India. We recommend checking your local state regulations.',
    },
    {
      q: 'How do I withdraw my winnings?',
      a: 'Withdraw instantly to UPI or your bank account. Most cash-outs complete in under five minutes.',
    },
    {
      q: 'Can I actually win in an online casino?',
      a: 'Yes. Every game uses certified RNG and published RTP so outcomes are genuinely random and verifiable.',
    },
    {
      q: 'Are casino games skill or luck?',
      a: 'It depends. Slots and crash games are luck-based, while Poker and Blackjack reward skill and strategy.',
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.appBg }}
      contentContainerStyle={{ padding: spacing.lg }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.brand[400]} />
      }
    >
      {!isFiltering ? (
        <>
          {banners.length > 0 ? (
            <BannerCarousel banners={banners} />
          ) : (
            <>
              <Card strong glow style={s.hero}>
                <Badge icon="sparkles">WELCOME OFFER</Badge>
                <Text style={s.heroTitle}>
                  Get a <Text style={s.heroGold}>5% boost</Text> on your first deposit
                </Text>
                <Text style={s.heroText}>
                  Sign up in seconds and claim up to{' '}
                  <Text style={s.heroStrong}>₹5,000</Text> in instant bonus credits — no
                  wagering tricks.
                </Text>
                <Button
                  title="Claim ₹5,000"
                  icon="arrow-forward"
                  style={s.heroCta}
                  onPress={() => navigation.navigate(token ? 'deposit' : 'register')}
                />
                <Text style={s.heroNote}>⚡ Credited instantly</Text>
              </Card>

              <View style={s.statRow}>
                <Card style={s.stat}>
                  <Icon name="trophy" size={19} color={t.brand[400]} />
                  <Text style={s.statValue}>₹8.4Cr</Text>
                  <Text style={s.statLabel}>Paid this week</Text>
                </Card>
                <Card style={s.stat}>
                  <Icon name="dice" size={19} color={t.emerald[400]} />
                  <Text style={s.statValue}>2,000+</Text>
                  <Text style={s.statLabel}>Live games</Text>
                </Card>
              </View>
            </>
          )}

          <View style={s.ticker}>
            <View style={s.tickerTag}>
              <Icon name="flash" size={12} color={t.surface[950]} />
              <Text style={s.tickerTagText}>LATEST</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tickerList}>
              {TICKER.map((item) => (
                <Text key={item} style={s.tickerItem}>
                  {item}
                </Text>
              ))}
            </ScrollView>
          </View>

          <CategoryStrip onSelect={openCategory} />
        </>
      ) : null}

      {providers.length > 0 ? (
        <>
          <View style={s.headingRow}>
            <Text style={s.heading}>Game Providers</Text>
            {selectedProvider ? (
              <Pressable onPress={() => setSelectedProvider(null)} style={s.clear} hitSlop={8}>
                <Icon name="close" size={12} color={t.brand[400]} />
                <Text style={s.clearText}>CLEAR</Text>
              </Pressable>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {providers.map((p) => {
              const active = p === selectedProvider;
              return (
                <Pressable
                  key={p}
                  onPress={() => setSelectedProvider(active ? null : p)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[s.chip, active && s.chipActive]}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{p.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      {isFiltering ? (
        <View>
          <Text style={s.resultsTitle}>
            {isSearching ? `Results for “${searchQuery}”` : 'Results'} ({filteredGames.length})
          </Text>
          {isSearching && searching && filteredGames.length === 0 ? (
            <View style={s.centered}>
              <Muted>Searching…</Muted>
            </View>
          ) : filteredGames.length > 0 ? (
            <View style={s.grid}>
              {filteredGames.map((game) => (
                <GameCard key={game.id} game={game} onPress={openGame} width={'31.5%'} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="search"
              title="No games found"
              text="Try a different search or provider filter."
            />
          )}
        </View>
      ) : loading ? (
        <View style={{ gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={110} />
          ))}
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.error}>{error}</Text>
          <Muted style={{ marginTop: 6, textAlign: 'center' }}>
            Start the API and import database/init.sql.
          </Muted>
        </View>
      ) : games.length === 0 ? (
        <EmptyState
          icon="game-controller"
          title="No games in catalog"
          text="Import database/init.sql on the API."
        />
      ) : (
        <>
          <Section
            title="Live Sports"
            kicker="IN PLAY NOW"
            icon="trophy"
            accent="emerald"
            items={liveSports}
            onPlay={openGame}
            onSeeAll={() => navigation.navigate('games', { category: 'sports', title: 'Sports' })}
          />
          <Section
            title="Casino Lobby"
            kicker="TOP PROVIDERS"
            icon="dice"
            accent="brand"
            items={casinoGames}
            onPlay={openGame}
            onSeeAll={() =>
              navigation.navigate('games', { category: 'live-casino', title: 'Live Casino' })
            }
          />
          <Section
            title="Trending Games"
            kicker="PLAYER FAVOURITES"
            icon="flame"
            accent="rose"
            items={trendingGames}
            onPlay={openGame}
            onSeeAll={() => navigation.navigate('games', { category: 'featured', title: 'Trending' })}
            ranked
          />
          <Section
            title="Trending Slots"
            kicker="BIG MULTIPLIERS"
            icon="sparkles"
            accent="brand"
            items={trendingSlots}
            onPlay={openGame}
            onSeeAll={() => navigation.navigate('games', { category: 'slots', title: 'Slots' })}
            ranked
          />

          <BigWins limit={6} />

          <View style={s.sectionHead}>
            <Text style={s.sectionKicker}>WHY WE'RE DIFFERENT</Text>
            <Text style={s.sectionTitle}>Built for players who expect more</Text>
          </View>
          <View style={s.featureGrid}>
            {FEATURES.map((f) => (
              <Card key={f.title} style={s.feature}>
                <View style={s.featureIcon}>
                  <Icon name={f.icon} size={19} color={t.brand[400]} />
                </View>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </Card>
            ))}
          </View>

          <Text style={[s.heading, { textAlign: 'center', marginBottom: spacing.lg }]}>
            Worldwide partnerships
          </Text>
          <View style={s.partnerGrid}>
            {PARTNERS.map((p) => (
              <View key={p} style={s.partner}>
                <Text style={s.partnerName}>{p}</Text>
              </View>
            ))}
          </View>

          <View style={s.sectionHead}>
            <Text style={s.sectionKicker}>KNOWLEDGE BASE</Text>
            <Text style={s.sectionTitle}>Frequently asked questions</Text>
          </View>
          {faqs.map((faq, i) => {
            const open = openFaq === i;
            return (
              <View key={faq.q} style={[s.faqItem, open && s.faqOpen]}>
                <Pressable
                  onPress={() => setOpenFaq(open ? -1 : i)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  style={s.faqHead}
                >
                  <View style={[s.faqDot, open && s.faqDotOpen]} />
                  <Text style={s.faqQ}>{faq.q}</Text>
                  <Icon
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={t.fg(0.7)}
                  />
                </Pressable>
                {open ? <Text style={s.faqA}>{faq.a}</Text> : null}
              </View>
            );
          })}
        </>
      )}

      <View style={spacer} />
    </ScrollView>
  );
}
