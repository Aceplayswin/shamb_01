import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../store/auth';
import { useWalletStore } from '../store/walletStore';
import { CustomTabBar } from '../components/CustomTabBar';
import { colors } from '../theme';
import { useBranding } from '../branding';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { GamesScreen } from '../screens/GamesScreen';
import { PlayHubScreen } from '../screens/PlayHubScreen';
import { CategoryGamesScreen } from '../screens/CategoryGamesScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PlayScreen } from '../screens/PlayScreen';
import { DepositScreen } from '../screens/DepositScreen';
import { WithdrawScreen } from '../screens/WithdrawScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { SupportScreen } from '../screens/SupportScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PromotionsScreen } from '../screens/PromotionsScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.brand500,
    background: colors.background,
    card: colors.surface800,
    text: colors.text,
    border: colors.border,
  },
};

function renderTabBar(props) {
  return <CustomTabBar {...props} />;
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface800 },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Games" component={GamesScreen} options={{ title: 'Categories' }} />
      <Tab.Screen name="Play" component={PlayHubScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydrateWallet = useWalletStore((s) => s.hydrate);
  const branding = useBranding();

  useEffect(() => {
    hydrateAuth();
    hydrateWallet();
  }, [hydrateAuth, hydrateWallet]);

  if (!isHydrated) {
    return (
      <View style={styles.splash}>
        <Text style={[styles.logo, { color: branding.theme_color }]}>{branding.product_name}</Text>
        <ActivityIndicator color={branding.theme_color} style={styles.loader} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface800 },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="CategoryGames" component={CategoryGamesScreen} />
        <Stack.Screen name="Play" component={PlayScreen} options={{ title: 'Play' }} />
        <Stack.Screen name="Deposit" component={DepositScreen} options={{ title: 'Deposit' }} />
        <Stack.Screen name="Withdraw" component={WithdrawScreen} options={{ title: 'Withdraw' }} />
        <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ title: 'Transactions' }} />
        <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Support' }} />
        <Stack.Screen name="Promotions" component={PromotionsScreen} options={{ title: 'Promotions' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile' }} />
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login', presentation: 'modal' }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.brand400,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  loader: { marginTop: 16 },
});
