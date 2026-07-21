// Theme 1 Register — direct sign-up, instant access. KYC is required before the
// first withdrawal, not to sign up.

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/auth';
import { useThemedStyles } from '../../useThemedStyles';
import { spacing, typography } from '../../palettes';
import { Button, Card, Input } from '../components/ui';

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg },
  content: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  card: { padding: spacing.xl },
  title: { fontSize: 26, fontWeight: '900', color: t.appFg },
  sub: { ...typography.body, color: t.muted, marginTop: 6 },
  form: { marginTop: spacing.xl, gap: spacing.lg },
  error: {
    ...typography.body,
    color: t.danger[400],
    backgroundColor: t.danger[500] + '1a',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: spacing.xl },
  footerText: { ...typography.body, color: t.muted },
  link: { ...typography.body, color: t.brand[400], fontWeight: '800' },
  terms: { ...typography.caption, color: t.muted, textAlign: 'center', marginTop: spacing.md },
});

export default function Theme1Register({ navigation }) {
  const s = useThemedStyles(styles);
  const setAuth = useAuthStore((st) => st.setAuth);

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const register = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          phone,
          fullName,
          password,
          referralCode: referralCode.trim() || undefined,
        }),
      });
      await setAuth({
        token: result.token,
        userId: result.userId,
        username: result.username,
      });
      navigation.reset({ index: 0, routes: [{ name: 'onboarding' }] });
    } catch (e) {
      setError(e?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Card strong glow style={s.card}>
          <Text style={s.title}>Create account</Text>
          <Text style={s.sub}>
            Instant access. KYC required before first withdrawal.
          </Text>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <View style={s.form}>
            <Input
              label="Full name"
              icon="person-outline"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full name"
              autoCapitalize="words"
            />
            <Input
              label="Phone number"
              icon="call-outline"
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
            <Input
              label="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="Min 6 characters"
              secureTextEntry
            />

            <Input
              label="Referral code (optional)"
              icon="gift-outline"
              value={referralCode}
              onChangeText={(v) => setReferralCode(v.toUpperCase())}
              placeholder="Referral code"
              autoCapitalize="characters"
              maxLength={20}
            />

            <Button
              title="Create Account"
              onPress={register}
              loading={loading}
              disabled={!phone || !fullName || password.length < 6}
            />
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account?</Text>
            <Pressable onPress={() => navigation.navigate('login')} hitSlop={8}>
              <Text style={s.link}>Login</Text>
            </Pressable>
          </View>
          <Text style={s.terms}>
            18+ Only. By registering you agree to our Terms &amp; Conditions.
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
