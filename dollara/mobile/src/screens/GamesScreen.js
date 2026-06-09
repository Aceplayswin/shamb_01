import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { CATEGORIES } from '../config';
import { api } from '../services/api';
import { colors, radius, spacing } from '../theme';

export function GamesScreen({ navigation }) {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    CATEGORIES.forEach(async (cat) => {
      try {
        const games = await api(`/api/v1/games?category=${cat.api}&limit=200`);
        setCounts((prev) => ({ ...prev, [cat.api]: games.length }));
      } catch {
        setCounts((prev) => ({ ...prev, [cat.api]: 0 }));
      }
    });
  }, []);

  return (
    <View style={styles.flex}>
      <Text style={styles.subtitle}>Browse by category</Text>
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const count = counts[item.api];
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() =>
                navigation.navigate('CategoryGames', {
                  slug: item.slug,
                  label: item.label,
                  apiCategory: item.api,
                })
              }
            >
              <View style={[styles.iconWrap, { backgroundColor: `${item.color}22` }]}>
                <Icon name={item.icon} size={26} color={item.color} />
              </View>
              <View style={styles.body}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.count}>
                  {count === undefined ? 'Loading…' : `${count} games`}
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.textDim} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  subtitle: {
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    fontSize: 14,
  },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface800,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  pressed: { borderColor: colors.brand500, opacity: 0.95 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  label: { color: colors.text, fontSize: 17, fontWeight: '700' },
  count: { color: colors.textDim, fontSize: 12, marginTop: 2 },
});
