// Navigation is theme-agnostic.
//
// Route keys and their order live in the registry; the chrome (header, tab bar,
// which routes are tabs) comes from the active theme's shell. Switching a
// product to another theme therefore changes the entire look without touching
// this file.
//
// The chrome components below sit at module scope and resolve the active shell
// from context themselves. Defining them inside the navigator would give them a
// new identity on every render, which remounts the header and tab bar (and
// throws away their state) whenever anything above re-renders.

import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/auth';
import { useBranding, useProductTheme, useTheme } from '../hooks/useBranding';
import { resolveScreen, resolveShell } from '../themes/registry';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Screens reachable from the tab bar keep the tabs visible; everything else is
// pushed onto the stack above them.
const STACK_ROUTES = [
  { key: 'games', title: 'Games' },
  { key: 'play', title: 'Play' },
  { key: 'wallet', title: 'Wallet' },
  { key: 'deposit', title: 'Deposit' },
  { key: 'withdraw', title: 'Withdraw' },
  { key: 'betHistory', title: 'Bet History' },
  { key: 'bonus', title: 'My Bonuses' },
  { key: 'refer', title: 'Refer & Earn' },
  { key: 'support', title: 'Support' },
  { key: 'settings', title: 'Settings' },
  { key: 'rules', title: 'Rules' },
  { key: 'appDownload', title: 'Get the App' },
  { key: 'login', title: 'Log in' },
  { key: 'register', title: 'Create account' },
  { key: 'onboarding', title: 'Welcome' },
];

function useShell() {
  const themeKey = useProductTheme();
  return resolveShell(themeKey);
}

function ThemedHeader(props) {
  const Shell = useShell();
  return <Shell.TopBar {...props} />;
}

function ThemedTabBar(props) {
  const Shell = useShell();
  return <Shell.TabBar {...props} />;
}

const renderHeader = (props) => <ThemedHeader {...props} />;
const renderTabBar = (props) => <ThemedTabBar {...props} />;

function MainTabs() {
  const themeKey = useProductTheme();
  const Shell = resolveShell(themeKey);

  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{ headerShown: false }}
      backBehavior="history"
    >
      {Shell.tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={resolveScreen(themeKey, tab.screen)}
          initialParams={tab.params}
          options={{
            title: tab.label,
            tabBarLabel: tab.label,
            tabBarIconName: tab.icon,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

function Splash() {
  const t = useTheme();
  const branding = useBranding();
  return (
    <View style={[styles.splash, { backgroundColor: t.appBg }]}>
      <Text style={[styles.logo, { color: branding.theme_color }]}>
        {branding.product_name}
      </Text>
      <ActivityIndicator color={branding.theme_color} />
    </View>
  );
}

export function RootNavigator() {
  const themeKey = useProductTheme();
  const t = useTheme();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const Shell = resolveShell(themeKey);

  const navTheme = useMemo(
    () => ({
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        primary: t.brand[500],
        background: t.appBg,
        card: t.rail,
        text: t.appFg,
        border: t.hairline(0.08),
      },
    }),
    [t],
  );

  if (!isHydrated) return <Splash />;

  return (
    <NavigationContainer theme={navTheme}>
      <Shell>
        <Stack.Navigator screenOptions={{ header: renderHeader }}>
          <Stack.Screen name="tabs" component={MainTabs} options={{ title: '' }} />

          {STACK_ROUTES.map((route) => {
            const Screen = resolveScreen(themeKey, route.key);
            if (!Screen) return null;
            return (
              <Stack.Screen
                key={route.key}
                name={route.key}
                component={Screen}
                options={{ title: route.title }}
              />
            );
          })}
        </Stack.Navigator>
      </Shell>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  logo: { fontSize: 36, fontWeight: '900' },
});
