// Theme 1 Login — phone + password, plus the one-tap demo session.
//
// Staff sign-in lives on the web console only: the mobile build ships no admin
// surface, so the web login's Player/Staff switch is deliberately absent here.

import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useUnifiedLogin } from '../../../hooks/useUnifiedLogin';
import { useThemedStyles } from '../../useThemedStyles';
import { spacing, typography } from '../../palettes';
import { Button, Card, Input } from '../components/ui';

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg },
  content: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxxl },
  card: { padding: spacing.xl },
  title: { fontSize: 26, fontWeight: '900', color: t.appFg },
  sub: { ...typography.body, color: t.muted, marginTop: 6 },
  form: { marginTop: spacing.xl, gap: spacing.lg },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  line: { flex: 1, height: 1, backgroundColor: t.hairline(0.09) },
  dividerText: { ...typography.caption, color: t.muted },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: spacing.xl },
  footerText: { ...typography.body, color: t.muted },
  link: { ...typography.body, color: t.brand[400], fontWeight: '800' },
});

export default function Theme1Login({ navigation }) {
  const s = useThemedStyles(styles);

  const {
    identifier,
    setIdentifier,
    password,
    setPassword,
    loading,
    demoLoading,
    submit,
    tryDemo,
  } = useUnifiedLogin({
    // Land on Home with the stack reset so Back can't return to the login form.
    onSuccess: () => navigation.reset({ index: 0, routes: [{ name: 'tabs' }] }),
  });

  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Card strong glow style={s.card}>
          <Text style={s.title}>Welcome back</Text>
          <Text style={s.sub}>Sign in with your phone and password.</Text>

          <View style={s.form}>
            <Input
              label="Phone number"
              icon="call-outline"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
            <Input
              label="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Button title="Log in" onPress={submit} loading={loading} />
          </View>

          <View style={s.divider}>
            <View style={s.line} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.line} />
          </View>

          <Button
            title={demoLoading ? 'Starting…' : 'Play demo'}
            variant="outline"
            icon="play-circle-outline"
            loading={demoLoading}
            onPress={tryDemo}
            style={{ marginTop: spacing.lg }}
          />

          <View style={s.footer}>
            <Text style={s.footerText}>New user?</Text>
            <Pressable onPress={() => navigation.navigate('register')} hitSlop={8}>
              <Text style={s.link}>Register</Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
