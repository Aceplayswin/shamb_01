import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PasswordInput } from '../components/PasswordInput';
import { api } from '../services/api';
import { useAuthStore } from '../store/auth';
import { colors, radius, spacing } from '../theme';

const CHANNELS = [
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
];

export function RegisterScreen({ navigation }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState('phone');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [channel, setChannel] = useState('sms');
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!phone || !fullName || password.length < 6) return;
    setLoading(true);
    try {
      const res = await api('/api/v1/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone, channel }),
      });
      if (res.otp) {
        setOtp(res.otp);
        Alert.alert('OTP sent', `Your code: ${res.otp}`);
      } else {
        Alert.alert('OTP sent', 'Check your phone for the verification code.');
      }
      setStep('otp');
    } catch (e) {
      Alert.alert('Failed', e.message ?? 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const result = await api('/api/v1/auth/register/otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp, fullName, password }),
      });
      await setAuth({
        token: result.token,
        userId: result.userId,
        username: result.username,
        isDemo: false,
      });
      navigation.navigate('Main');
    } catch (e) {
      Alert.alert('Registration failed', e.message ?? 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.sub}>₹1,000 welcome bonus on signup</Text>

        <Card>
          {step === 'phone' ? (
            <>
              <Input label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your name" />
              <Input
                label="Phone"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit mobile"
              />
              <PasswordInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
              />
              <Text style={styles.label}>OTP channel</Text>
              <View style={styles.channels}>
                {CHANNELS.map((c) => (
                  <Pressable
                    key={c.value}
                    style={[styles.chip, channel === c.value && styles.chipActive]}
                    onPress={() => setChannel(c.value)}
                  >
                    <Text style={[styles.chipText, channel === c.value && styles.chipTextActive]}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Button
                title="Send OTP"
                onPress={sendOtp}
                loading={loading}
                disabled={!phone || !fullName || password.length < 6}
              />
            </>
          ) : (
            <>
              <Input
                label="6-digit OTP"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                placeholder="123456"
                style={styles.otp}
              />
              <Button
                title="Verify & create account"
                onPress={register}
                loading={loading}
                disabled={otp.length !== 6}
              />
              <Pressable onPress={() => setStep('phone')}>
                <Text style={styles.link}>Change phone number</Text>
              </Pressable>
            </>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  back: { color: colors.brand400, marginBottom: spacing.md, fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  sub: { color: colors.textMuted, marginBottom: spacing.lg },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  channels: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.brand500, backgroundColor: 'rgba(255, 152, 0, 0.15)' },
  chipText: { color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.brand300 },
  otp: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  link: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
