import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { PROMOTIONS } from '../data/mockGames';
import { colors, radius, spacing } from '../theme';

export function PromotionsScreen() {
  const claim = (promo) => {
    Alert.alert('Promo applied', `Code ${promo.code} copied to clipboard.\n${promo.subtitle}`);
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>Active offers for your account</Text>
      {PROMOTIONS.map((p) => (
        <Pressable key={p.id} style={styles.card} onPress={() => claim(p)}>
          <View style={styles.iconWrap}>
            <Icon name={p.icon} size={28} color={colors.brand400} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>{p.title}</Text>
            <Text style={styles.sub}>{p.subtitle}</Text>
            <Text style={styles.code}>{p.code}</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.textDim} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  intro: { color: colors.textMuted, marginBottom: spacing.lg, fontSize: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface800,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 152, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { color: colors.text, fontWeight: '700', fontSize: 16 },
  sub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  code: {
    color: colors.brand400,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.sm,
    letterSpacing: 1,
  },
});
