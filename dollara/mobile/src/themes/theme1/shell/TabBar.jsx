// Theme 1 bottom tabs — the web header's mobile tab bar, with the middle tab
// raised into a brand-colored puck.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../hooks/useBranding';
import { useThemedStyles } from '../../useThemedStyles';
import { spacing } from '../../palettes';

const styles = (t) => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: t.rail,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.hairline(0.07),
    paddingTop: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 3, paddingBottom: 4 },
  iconBox: { height: 26, alignItems: 'center', justifyContent: 'center' },
  center: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginTop: -18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.brand[500],
    shadowColor: t.brand[500],
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  label: { fontSize: 10, fontWeight: '700', color: t.muted },
  labelActive: { color: t.brand[400] },
  labelCenter: { marginTop: -2 },
});

export function TabBar({ state, descriptors, navigation }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const centerIndex = Math.floor(state.routes.length / 2);

  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const isCenter = index === centerIndex;
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const icon = options.tabBarIconName ?? 'ellipse';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() =>
              navigation.emit({ type: 'tabLongPress', target: route.key })
            }
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            style={s.tab}
          >
            {isCenter ? (
              <View style={s.center}>
                <Icon name={icon} size={22} color={t.surface[950]} />
              </View>
            ) : (
              <View style={s.iconBox}>
                <Icon
                  name={focused ? icon : `${icon}-outline`}
                  size={21}
                  color={focused ? t.brand[400] : t.muted}
                />
              </View>
            )}
            <Text style={[s.label, focused && s.labelActive, isCenter && s.labelCenter]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
