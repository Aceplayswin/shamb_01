// Theme 1 Games — a category listing. `route.params.category` is the URL slug
// the web uses (live-casino, sports, slots, …) plus the two pseudo-categories
// `all` and `featured`; the optional `q` narrows it to a game family, matching
// the web's `?q=` links.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { api } from '../../../services/api';
import { useTheme } from '../../../hooks/useBranding';
import { categoryFromSlug, searchGames } from '../../../lib/gameRoutes';
import { useThemedStyles } from '../../useThemedStyles';
import { spacing, typography } from '../../palettes';
import { GameCard } from '../components/GameCard';
import { EmptyState, Skeleton, useTabBarSpacer } from '../components/ui';

const styles = (t) => ({
  list: { padding: spacing.lg },
  title: { ...typography.title, color: t.appFg, textTransform: 'capitalize' },
  count: { ...typography.body, color: t.muted, marginTop: 2, marginBottom: spacing.lg },
  row: { gap: spacing.md, marginBottom: spacing.md },
  loading: { padding: spacing.lg, gap: spacing.md },
});

export default function Theme1Games({ navigation, route }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const spacer = useTabBarSpacer();

  const slug = route.params?.category ?? 'all';
  const q = (route.params?.q ?? '').trim();
  const heading = route.params?.title;

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    let url;
    if (slug === 'all') url = '/api/v1/games?limit=200';
    else if (slug === 'featured') url = '/api/v1/games?featured=true&limit=200';
    else url = `/api/v1/games?category=${categoryFromSlug(slug)}&limit=200`;

    api(url)
      .then((data) => active && setGames(Array.isArray(data) ? data : []))
      .catch(() => active && setGames([]))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [slug]);

  const filtered = useMemo(() => searchGames(games, q), [games, q]);

  const title =
    heading ||
    q ||
    (slug === 'all' ? 'All Games' : slug === 'featured' ? 'Trending' : slug.replace(/-/g, ' '));

  const openGame = useCallback(
    (game) => navigation.navigate('play', { slug: game.slug, name: game.name }),
    [navigation],
  );

  const header = (
    <View>
      <Text style={s.title}>{title}</Text>
      {!loading ? (
        <Text style={s.count}>
          {filtered.length} game{filtered.length === 1 ? '' : 's'}
        </Text>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.appBg }}>
        <View style={s.loading}>
          {header}
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={150} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: t.appBg }}
      data={filtered}
      keyExtractor={(item) => String(item.id)}
      numColumns={3}
      columnWrapperStyle={s.row}
      contentContainerStyle={s.list}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState
          icon="game-controller"
          title="No games found"
          text="Nothing matches this category yet."
        />
      }
      ListFooterComponent={<View style={spacer} />}
      renderItem={({ item }) => <GameCard game={item} onPress={openGame} width="31.5%" />}
    />
  );
}
