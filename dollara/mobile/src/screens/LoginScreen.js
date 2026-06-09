import { useState } from 'react';
import {
  Alert,
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
import { PasswordInput } from '../components/PasswordInput';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';
import { colors, spacing } from '../theme';
import { useBranding } from '../branding';

export function LoginScreen({ navigation }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const branding = useBranding();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!phone || !password) {
      Alert.alert('Missing fields', 'Enter your phone number and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await api('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });
      await setAuth({
        token: result.token,
        userId: result.userId,
        isDemo: false,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Login failed', e.message ?? 'Invalid phone or password');
    } finally {
      setLoading(false);
    }
  };

  const tryDemo = async () => {
    setLoading(true);
    try {
      const result = await api('/api/v1/auth/demo', { method: 'POST' });
      await setAuth({
        token: result.token,
        userId: result.demoId,
        username: result.demoId,
        isDemo: true,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Demo failed', e.message ?? 'Could not start demo session');
    } finally {
      setLoading(false);
    }
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
        <Text style={[styles.logo, { color: branding.theme_color }]}>{branding.product_name}</Text>
        <Text style={styles.tagline}>Play · Win · Repeat</Text>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="log-in-outline" size={28} color={colors.brand400} />
            <View>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in with phone and password</Text>
            </View>
          </View>

          <Input
            label="Phone"
            placeholder="9876543210"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <PasswordInput
            label="Password"
            placeholder="Enter password"
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
