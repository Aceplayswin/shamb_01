import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GameCard } from '../components/GameCard';
import { EmptyState } from '../components/EmptyState';
import { getGamesByCategory } from '../data/mockGames';
import { colors, spacing } from '../theme';

export function CategoryGamesScreen({ route, navigation }) {
  const { label, apiCategory } = route.params;
  const games = getGamesByCategory(apiCategory);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.count}>{games.length} games available</Text>
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
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  count: { color: colors.textDim, fontSize: 13, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
});
