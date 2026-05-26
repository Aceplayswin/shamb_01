import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { useAuthStore } from '../store/auth';
import { colors, spacing } from '../theme';

export function EditProfileScreen({ navigation }) {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    await updateProfile({ full_name: fullName, phone, email });
    setLoading(false);
    Alert.alert('Saved', 'Profile updated successfully.');
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Input label="Full name" value={fullName} onChangeText={setFullName} />
          <Input label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <Input
            label="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Button title="Save changes" onPress={save} loading={loading} />
        </Card>
        <Text style={styles.note}>KYC verification is simulated in demo mode.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  note: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: spacing.md },
});
