import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors, radius, spacing } from '../theme';

export function MenuRow({ icon, label, value, onPress, danger, showChevron = true }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]}
    >
      <View style={[styles.iconWrap, danger && styles.iconDanger]}>
        <Icon name={icon} size={20} color={danger ? colors.red : colors.brand400} />
      </View>
      <Text style={[styles.label, danger && styles.labelDanger]}>{label}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {showChevron && onPress ? (
        <Icon name="chevron-forward" size={18} color={colors.textDim} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.surface700 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 152, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDanger: { backgroundColor: colors.redDim },
  label: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  labelDanger: { color: colors.red },
  value: { color: colors.textDim, fontSize: 13 },
});
