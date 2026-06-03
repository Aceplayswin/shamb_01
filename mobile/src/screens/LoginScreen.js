import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Input } from '../components/Input';
import { useAuthStore } from '../store/auth';
import { colors, spacing } from '../theme';

export function LoginScreen({ navigation }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    await setAuth({
      token: `user_${Date.now()}`,
      userId: 'user-local',
      username: phone ? `user_${phone.slice(-4)}` : 'player',
      fullName: 'Player',
      phone: phone || '9876543210',
      isDemo: false,
    });
    setLoading(false);
    navigation.goBack();
  };

  const tryDemo = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    await setAuth({
      token: 'mock-demo-token',
      username: 'demo_user',
      fullName: 'Demo Player',
      phone: '9999999999',
      isDemo: true,
    });
    setLoading(false);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>DOLLARA</Text>
        <Text style={styles.tagline}>Play · Win · Repeat</Text>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="log-in-outline" size={28} color={colors.brand400} />
            <View>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to your account</Text>
            </View>
          </View>

          <Input
            label="Phone"
            placeholder="9876543210"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <Input
            label="Password"
            placeholder="Enter password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button title="Sign in" onPress={submit} loading={loading} />
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          <Button title="Try demo — ₹50,000 balance" variant="secondary" onPress={tryDemo} loading={loading} />
          <Text style={styles.footer}>
            New here?{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
              Create account
            </Text>
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xxl },
  logo: {
    fontSize: 42,
    fontWeight: '900',
    fontStyle: 'italic',
    color: colors.brand500,
    textAlign: 'center',
  },
  tagline: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: 3,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  card: { backgroundColor: colors.surface800 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md, gap: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textDim, fontSize: 12 },
  footer: { color: colors.textDim, textAlign: 'center', marginTop: spacing.lg, fontSize: 14 },
  link: { color: colors.brand400, fontWeight: '600' },
});
