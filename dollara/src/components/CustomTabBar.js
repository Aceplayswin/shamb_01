import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { colors, radius, spacing } from '../theme';

const TABS = {
  Home: { active: 'home', inactive: 'home-outline', label: 'Home' },
  Games: { active: 'game-controller', inactive: 'game-controller-outline', label: 'Games' },
  Play: { active: 'flash', inactive: 'flash', label: 'Play' },
  Wallet: { active: 'wallet', inactive: 'wallet-outline', label: 'Wallet' },
  Profile: { active: 'person', inactive: 'person-outline', label: 'Profile' },
};

export function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const config = TABS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline', label: route.name };
          const isCenter = route.name === 'Play';

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          if (isCenter) {
            return (
              <Pressable key={route.key} onPress={onPress} style={styles.centerSlot}>
                <View style={[styles.centerBtn, focused && styles.centerBtnActive]}>
                  <Icon name="flash" size={28} color={colors.background} />
                </View>
                <Text style={[styles.label, focused && styles.labelActive]}>{config.label}</Text>
              </Pressable>
            );
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
              <Icon
                name={focused ? config.active : config.inactive}
                size={24}
                color={focused ? colors.brand400 : colors.textDim}
              />
              <Text style={[styles.label, focused && styles.labelActive]}>{config.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface800,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: 2,
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    marginTop: -28,
  },
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface800,
    shadowColor: colors.brand500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  centerBtnActive: {
    backgroundColor: colors.brand400,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textDim,
    marginTop: 2,
  },
  labelActive: {
    color: colors.brand400,
  },
});
