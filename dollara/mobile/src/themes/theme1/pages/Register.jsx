// Theme 1 Register — Path A: OTP verification, instant access. KYC is required
// before the first withdrawal, not to sign up.

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/auth';
import { useThemedStyles } from '../../useThemedStyles';
import { spacing, typography } from '../../palettes';
import { Button, Card, Input } from '../components/ui';

const CHANNELS = [
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'voice', label: 'Voice' },
];

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
  devOtp: {
    ...typography.body,
    color: t.brand[300],
    textAlign: 'center',
    backgroundColor: t.brandA(500, 0.1),
    borderWidth: 1,
    borderColor: t.brandA(400, 0.3),
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  channelLabel: { ...typography.body, color: t.muted, fontSize: 13, marginBottom: 6 },
  channels: { flexDirection: 'row', gap: spacing.sm },
  channel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    backgroundColor: t.panelA(0.6),
  },
  channelActive: { borderColor: t.brand[500], backgroundColor: t.brandA(500, 0.12) },
  channelText: { fontSize: 12, fontWeight: '700', color: t.muted },
  channelTextActive: { color: t.brand[300] },
  otpInput: { textAlign: 'center', fontSize: 26, letterSpacing: 10, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: spacing.xl },
  footerText: { ...typography.body, color: t.muted },
  link: { ...typography.body, color: t.brand[400], fontWeight: '800' },
  terms: { ...typography.caption, color: t.muted, textAlign: 'center', marginTop: spacing.md },
});

export default function Theme1Register({ navigation }) {
  const s = useThemedStyles(styles);
  const setAuth = useAuthStore((st) => st.setAuth);

  const [step, setStep] = useState('phone'); // phone | otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [channel, setChannel] = useState('sms');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const sendOtp = async () => {
    setLoading(true);
    setError('');
    setDevOtp('');
    try {
      const res = await api('/api/v1/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone, channel }),
      });
      // Dev builds return the code so the flow is testable without a gateway.
      if (res.otp) {
        setOtp(res.otp);
        setDevOtp(res.otp);
      }
      setStep('otp');
    } catch (e) {
      setError(e?.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api('/api/v1/auth/register/otp', {
        method: 'POST',
        body: JSON.stringify({
          phone,
          otp,
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
            OTP verification — instant access. KYC required before first withdrawal.
          </Text>

          {error ? <Text style={s.error}>{error}</Text> : null}

          {step === 'phone' ? (
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

              <View>
                <Text style={s.channelLabel}>Send code via</Text>
                <View style={s.channels}>
                  {CHANNELS.map((c) => {
                    const active = channel === c.value;
                    return (
                      <Pressable
                        key={c.value}
                        onPress={() => setChannel(c.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[s.channel, active && s.channelActive]}
                      >
                        <Text style={[s.channelText, active && s.channelTextActive]}>
                          {c.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

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
                title="Send OTP"
                onPress={sendOtp}
                loading={loading}
                disabled={!phone || !fullName || password.length < 6}
              />
            </View>
          ) : (
            <View style={s.form}>
              {devOtp ? <Text style={s.devOtp}>Dev OTP: {devOtp}</Text> : null}
              <Input
                label="Enter 6-digit OTP"
                value={otp}
                onChangeText={setOtp}
                placeholder="••••••"
                keyboardType="number-pad"
                maxLength={6}
                inputStyle={s.otpInput}
              />
              <Button
                title="Verify & Register"
                onPress={register}
                loading={loading}
                disabled={otp.length !== 6}
              />
              <Button
                title="Change phone number"
                variant="ghost"
                onPress={() => setStep('phone')}
              />
            </View>
          )}

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
