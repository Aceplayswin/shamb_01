import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GameCard } from '../components/GameCard';
import { EmptyState } from '../components/EmptyState';
import { api } from '../services/api';
import { colors, spacing } from '../theme';

export function CategoryGamesScreen({ route, navigation }) {
  const { label, apiCategory } = route.params;
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadGames = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api(`/api/v1/games?category=${apiCategory}&limit=200`);
      setGames(data ?? []);
    } catch (e) {
      setError(e.message ?? 'Failed to load games');
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [apiCategory]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand400} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.count}>{games.length} games available</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {games.length > 0 ? (
        <View style={styles.grid}>
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onPress={(g) => navigation.navigate('Play', { game: g })}
            />
          ))}
        </View>
      ) : (
        <EmptyState icon="game-controller-outline" title="No games yet" message={`Check back soon for ${label}.`} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  count: { color: colors.textDim, fontSize: 13, marginBottom: spacing.md },
  error: { color: colors.orange, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
});
