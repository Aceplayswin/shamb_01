import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { BalanceCard } from '../components/BalanceCard';
import { useAuthStore } from '../store/auth';
import { colors, radius, spacing } from '../theme';
import { useBranding } from '../branding';
import { api } from '../services/api';

const { width } = Dimensions.get('window');

const PROVIDERS = ['MAC88', '18PEACHES', 'VELIPLAY', 'AVIATRIX', 'INOUT', 'GALAXSYS', 'SMARTSOFT', '2J'];

const LIVE_SPORTS = [
  { id: 's1', name: 'Lucky Sports', provider: 'MAC88', category: 'sports' },
  { id: 's2', name: 'E-Sports', provider: 'VELIPLAY', category: 'sports' },
  { id: 's3', name: 'Football', provider: '18PEACHES', category: 'sports' },
];

const CASINO_GAMES = [
  { id: 'c1', name: 'Live Roulette', provider: 'INOUT', category: 'live_casino' },
  { id: 'c2', name: 'Aviator', provider: 'AVIATRIX', category: 'slots' },
  { id: 'c3', name: 'Crazy Time', provider: 'SMARTSOFT', category: 'live_casino' },
  { id: 'c4', name: 'Mines', provider: 'GALAXSYS', category: 'slots' },
];

const TRENDING_GAMES = [
  { id: 't1', name: 'Crazy Time', provider: 'SMARTSOFT', category: 'live_casino' },
  { id: 't2', name: 'Forest Arrow', provider: 'TURBOGAMES', category: 'slots' },
  { id: 't3', name: 'AI Predictor', provider: 'In-House', category: 'ai_games' },
  { id: 't4', name: 'Mega Draw', provider: 'LOTTO', category: 'lottery' },
];

const ALL_GAMES = [...LIVE_SPORTS, ...CASINO_GAMES, ...TRENDING_GAMES];

const SECTION_ICONS = {
  sports: 'football',
  live_casino: 'videocam',
  slots: 'diamond',
  lottery: 'ticket',
  ai_games: 'sparkles',
};

function GameCardMobile({ item, onPlay, isGrid }) {
  const icon = SECTION_ICONS[item.category] ?? 'game-controller';
  return (
    <Pressable
      onPress={() => onPlay(item)}
      style={[styles.gameCard, isGrid ? styles.gameCardGrid : styles.gameCardCarousel]}
    >
      <View style={styles.gameCardInner}>
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={styles.gameThumb} resizeMode="cover" />
        ) : (
          <Icon name={icon} size={28} color={colors.brand400} />
        )}
        <Text style={styles.gameName}>{item.name}</Text>
        <Text style={styles.gameProvider}>{item.provider_name ?? item.provider}</Text>
      </View>
    </Pressable>
  );
}

function Carousel({ items, onPlay }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carouselContainer}
      decelerationRate="fast"
    >
      {items.map((item) => (
        <GameCardMobile key={item.id} item={item} onPlay={onPlay} />
      ))}
    </ScrollView>
  );
}

function SectionHeader({ icon, title, onSeeAll }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Icon name={icon} size={18} color={colors.brand400} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} style={styles.seeAllBtn}>
          <Text style={styles.seeAll}>See all</Text>
          <Icon name="chevron-forward" size={14} color={colors.brand400} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const branding = useBranding();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [liveSports, setLiveSports] = useState(LIVE_SPORTS);
  const [casinoGames, setCasinoGames] = useState(CASINO_GAMES);
  const [trendingGames, setTrendingGames] = useState(TRENDING_GAMES);
  const [allGames, setAllGames] = useState(ALL_GAMES);

  useEffect(() => {
    Promise.all([
      api('/api/v1/games?category=sports&limit=8').catch(() => []),
      api('/api/v1/games?category=live_casino&limit=8').catch(() => []),
      api('/api/v1/games/trending').catch(() => []),
      api('/api/v1/games?limit=50').catch(() => []),
    ]).then(([sports, casino, trending, all]) => {
      if (sports.length) setLiveSports(sports);
      if (casino.length) setCasinoGames(casino);
      if (trending.length) setTrendingGames(trending);
      if (all.length) setAllGames(all);
    });
  }, []);

  const handlePlayGame = (game) => {
    if (!token) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('Play', { game });
  };

  const filteredGames = allGames.filter((game) => {
    const name = game.name ?? '';
    const provider = game.provider_name ?? game.provider ?? '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = selectedProvider ? provider === selectedProvider : true;
    return matchesSearch && matchesProvider;
  });

  const isFiltering = searchQuery !== '' || selectedProvider !== null;

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.logo, { color: branding.theme_color }]}>{branding.product_name}</Text>
          <View style={styles.headerButtons}>
            <Pressable onPress={() => navigation.navigate('Promotions')} style={styles.iconBtn}>
              <Icon name="gift-outline" size={22} color={colors.text} />
            </Pressable>
            {!token ? (
              <Pressable onPress={() => navigation.navigate('Login')} style={styles.loginBtn}>
                <Text style={styles.loginBtnText}>Sign in</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => navigation.navigate('Wallet')} style={styles.walletChip}>
                <Icon name="wallet-outline" size={16} color={colors.brand400} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Icon name="search" size={18} color={colors.textDim} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search games..."
            placeholderTextColor={colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' ? (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Icon name="close-circle" size={20} color={colors.textDim} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {token ? (
          <View style={styles.balanceWrap}>
            <BalanceCard />
          </View>
        ) : null}

        <View style={styles.providersSection}>
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.providersLabel}>Providers</Text>
            {selectedProvider ? (
              <Pressable onPress={() => setSelectedProvider(null)}>
                <Text style={styles.clearFilterText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providersContainer}>
            {PROVIDERS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setSelectedProvider(p === selectedProvider ? null : p)}
                style={[styles.providerPill, p === selectedProvider && styles.providerPillActive]}
              >
                <Text style={[styles.providerPillText, p === selectedProvider && styles.providerPillTextActive]}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {isFiltering ? (
          <View style={styles.filteredSection}>
            <Text style={styles.sectionTitle}>Results ({filteredGames.length})</Text>
            {filteredGames.length > 0 ? (
              <View style={styles.grid}>
                {filteredGames.map((game) => (
                  <GameCardMobile key={game.id} item={game} onPlay={handlePlayGame} isGrid />
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No games found.</Text>
            )}
          </View>
        ) : (
          <>
            <Pressable style={styles.hero} onPress={() => navigation.navigate('Promotions')}>
              <View style={styles.heroGlow} />
              <Icon name="gift" size={32} color={colors.brand400} />
              <Text style={styles.heroPreTitle}>WELCOME BONUS</Text>
              <Text style={styles.heroTitle}>5%</Text>
              <Text style={styles.heroSubTitle}>UP TO ₹5,000</Text>
              <View style={styles.heroCta}>
                <Text style={styles.heroCtaText}>Claim now</Text>
                <Icon name="arrow-forward" size={14} color={colors.background} />
              </View>
            </Pressable>

            <View style={styles.quickNav}>
              {[
                { icon: 'football', label: 'Sports', screen: 'Games' },
                { icon: 'videocam', label: 'Casino', screen: 'Games' },
                { icon: 'diamond', label: 'Slots', screen: 'Games' },
                { icon: 'flash', label: 'Play', screen: 'Play' },
              ].map((q) => (
                <Pressable
                  key={q.label}
                  style={styles.quickNavItem}
                  onPress={() => navigation.navigate(q.screen)}
                >
                  <View style={styles.quickNavIcon}>
                    <Icon name={q.icon} size={22} color={colors.brand400} />
                  </View>
                  <Text style={styles.quickNavLabel}>{q.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.section}>
              <SectionHeader icon="football" title="Live sports" onSeeAll={() => navigation.navigate('Games')} />
              <Carousel items={liveSports} onPlay={handlePlayGame} />
            </View>

            <View style={styles.section}>
              <SectionHeader icon="videocam" title="Casino" onSeeAll={() => navigation.navigate('Games')} />
              <Carousel items={casinoGames} onPlay={handlePlayGame} />
            </View>

            <View style={styles.section}>
              <SectionHeader icon="flame" title="Trending" onSeeAll={() => navigation.navigate('Play')} />
              <Carousel items={trendingGames} onPlay={handlePlayGame} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.surface800,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logo: {
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'italic',
    color: colors.brand500,
  },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface700,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loginBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.brand500,
  },
  loginBtnText: { color: colors.background, fontSize: 13, fontWeight: '700' },
  walletChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface700,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface700,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  searchIcon: { marginRight: spacing.xs },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 12, fontSize: 15 },
  clearBtn: { padding: spacing.xs },
  content: { paddingBottom: spacing.xxl },
  balanceWrap: { padding: spacing.md, paddingBottom: 0 },
  providersSection: { marginTop: spacing.md },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  providersLabel: { color: colors.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  clearFilterText: { color: colors.brand400, fontSize: 12, fontWeight: '600' },
  providersContainer: { paddingHorizontal: spacing.md, gap: spacing.sm },
  providerPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface800,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerPillActive: { backgroundColor: colors.brand500, borderColor: colors.brand500 },
  providerPillText: { color: colors.textDim, fontSize: 11, fontWeight: '700' },
  providerPillTextActive: { color: colors.background },
  hero: {
    margin: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.surface800,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
  },
  heroPreTitle: { color: colors.brand400, fontSize: 14, fontWeight: '800', marginTop: spacing.sm },
  heroTitle: { color: colors.brand500, fontSize: 52, fontWeight: '900', fontStyle: 'italic' },
  heroSubTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brand500,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  heroCtaText: { color: colors.background, fontWeight: '700', fontSize: 13 },
  quickNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  quickNavItem: { alignItems: 'center' },
  quickNavIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface800,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  quickNavLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  section: { marginTop: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll: { color: colors.brand400, fontSize: 12, fontWeight: '600' },
  carouselContainer: { paddingHorizontal: spacing.md, gap: spacing.md },
  gameCard: {
    backgroundColor: colors.surface800,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    height: 140,
  },
  gameCardCarousel: { width: 140 },
  gameCardGrid: { width: (width - spacing.md * 3) / 2, marginBottom: spacing.md },
  gameCardInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface700,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  gameThumb: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
  },
  gameName: { color: colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  gameProvider: { color: colors.brand400, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  filteredSection: { padding: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: spacing.sm },
  emptyText: { color: colors.textDim, textAlign: 'center', marginTop: spacing.xl, fontSize: 15 },
});
