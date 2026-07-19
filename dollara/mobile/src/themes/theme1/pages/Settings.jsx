// Theme 1 Settings — preferences, notification toggles, read-only account
// details, and password change.

import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/auth';
import { useTheme } from '../../../hooks/useBranding';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { useThemedStyles } from '../../useThemedStyles';
import { radius, spacing, typography } from '../../palettes';
import { Button, Card, Input, Label, Row, Skeleton, StatusPill, useTabBarSpacer } from '../components/ui';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'bn', label: 'বাংলা' },
  { value: 'te', label: 'తెలుగు' },
  { value: 'ta', label: 'தமிழ்' },
];

const CURRENCIES = [
  { value: 'INR', label: '₹ INR' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'USDT', label: '₮ USDT' },
];

const DEFAULTS = {
  website_language: 'en',
  communication_language: 'en',
  currency: 'INR',
  notifications_enabled: true,
  marketing_opt_in: false,
};

const EMPTY_PASSWORDS = { current: '', next: '', confirm: '' };

/** A labelled row of mutually-exclusive chips — the mobile stand-in for the
 *  web's <select>, which has no good native equivalent on a phone. */
function ChoiceField({ label, hint, value, options, onChange }) {
  const s = useThemedStyles(styles);
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {hint ? <Text style={s.fieldHint}>{hint}</Text> : null}
      <View style={s.options}>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[s.option, active && s.optionActive]}
            >
              <Text style={[s.optionText, active && s.optionTextActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg },
  content: { padding: spacing.lg },
  intro: { ...typography.body, color: t.muted, marginBottom: spacing.lg },
  section: { padding: spacing.xl, marginBottom: spacing.lg },
  field: { marginTop: spacing.lg },
  fieldLabel: { ...typography.body, color: t.appFg, fontWeight: '600' },
  fieldHint: { ...typography.caption, color: t.muted, marginTop: 2 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  option: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    backgroundColor: t.panelA(0.6),
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
  optionActive: { borderColor: t.brand[500], backgroundColor: t.brandA(500, 0.14) },
  optionText: { fontSize: 13, fontWeight: '600', color: t.muted },
  optionTextActive: { color: t.brand[300] },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  status: { ...typography.body, textAlign: 'center', marginBottom: spacing.md },
  ok: { color: t.emerald[400] },
  err: { color: t.danger[400] },
});

export default function Theme1Settings({ navigation }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const spacer = useTabBarSpacer();
  const authed = useRequireAuth(navigation);

  const refreshSession = useAuthStore((st) => st.refreshSession);
  const logout = useAuthStore((st) => st.logout);

  const [form, setForm] = useState(DEFAULTS);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'ok' | 'err', text }

  useEffect(() => {
    if (!authed) return undefined;
    let active = true;
    api('/api/v1/settings')
      .then((data) => {
        if (!active) return;
        setForm({
          website_language: data.website_language ?? DEFAULTS.website_language,
          communication_language: data.communication_language ?? DEFAULTS.communication_language,
          currency: data.currency ?? DEFAULTS.currency,
          notifications_enabled: data.notifications_enabled ?? DEFAULTS.notifications_enabled,
          marketing_opt_in: data.marketing_opt_in ?? DEFAULTS.marketing_opt_in,
        });
        setAccount(data);
      })
      .catch((e) => active && setStatus({ type: 'err', text: e.message }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [authed]);

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus(null);
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const data = await api('/api/v1/settings', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setAccount(data);
      setStatus({ type: 'ok', text: 'Settings saved' });
      refreshSession();
    } catch (e) {
      setStatus({ type: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert('Log out', 'Sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'tabs' }] });
        },
      },
    ]);

  if (!authed) return null;

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.intro}>Manage your preferences and account.</Text>

      {loading ? (
        <View style={{ gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={110} />
          ))}
        </View>
      ) : (
        <>
          <Card style={s.section}>
            <Label>Preferences</Label>
            <ChoiceField
              label="Website language"
              hint="Language used across the app"
              value={form.website_language}
              options={LANGUAGES}
              onChange={(v) => update('website_language', v)}
            />
            <ChoiceField
              label="Communication language"
              hint="Notifications, emails & support"
              value={form.communication_language}
              options={LANGUAGES}
              onChange={(v) => update('communication_language', v)}
            />
            <ChoiceField
              label="Currency"
              hint="Display currency for balances"
              value={form.currency}
              options={CURRENCIES}
              onChange={(v) => update('currency', v)}
            />
          </Card>

          <Card style={s.section}>
            <Label>Notifications</Label>
            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Push & in-app notifications</Text>
                <Text style={s.fieldHint}>Bet results, deposits, withdrawals and alerts</Text>
              </View>
              <Switch
                value={form.notifications_enabled}
                onValueChange={(v) => update('notifications_enabled', v)}
                trackColor={{ false: t.surface[700], true: t.brand[500] }}
                thumbColor="#fff"
              />
            </View>
            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Promotional offers</Text>
                <Text style={s.fieldHint}>Bonuses, campaigns and marketing updates</Text>
              </View>
              <Switch
                value={form.marketing_opt_in}
                onValueChange={(v) => update('marketing_opt_in', v)}
                trackColor={{ false: t.surface[700], true: t.brand[500] }}
                thumbColor="#fff"
              />
            </View>
          </Card>

          <Card style={s.section}>
            <Label>Account</Label>
            <View style={{ marginTop: spacing.md }}>
              <Row label="Full name" value={account?.full_name} />
              <Row label="Username" value={account?.username} />
              <Row label="Phone" value={account?.phone} />
              <Row label="Email" value={account?.email} />
              <Row label="KYC status">
                <StatusPill status={account?.kyc_status} />
              </Row>
              <Row label="Account status" last>
                <StatusPill status={account?.account_status} />
              </Row>
            </View>
          </Card>

          <ChangePassword />

          {status ? (
            <Text style={[s.status, status.type === 'ok' ? s.ok : s.err]}>{status.text}</Text>
          ) : null}
          <Button title="Save changes" onPress={save} loading={saving} />
          <Button
            title="Log out"
            variant="danger"
            onPress={confirmLogout}
            style={{ marginTop: spacing.md }}
          />
        </>
      )}

      <View style={spacer} />
    </ScrollView>
  );
}

function ChangePassword() {
  const s = useThemedStyles(styles);
  const [form, setForm] = useState(EMPTY_PASSWORDS);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus(null);
  };

  const submit = async () => {
    if (form.next !== form.confirm) {
      setStatus({ type: 'err', text: 'New passwords do not match' });
      return;
    }
    if (form.next.length < 6) {
      setStatus({ type: 'err', text: 'New password must be at least 6 characters' });
      return;
    }
    setSaving(true);
    try {
      await api('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      });
      setForm(EMPTY_PASSWORDS);
      setStatus({ type: 'ok', text: 'Password changed' });
    } catch (e) {
      setStatus({ type: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={s.section}>
      <Label>Security</Label>
      <Text style={s.fieldHint}>Change the password you use to sign in.</Text>
      <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
        <Input
          label="Current password"
          value={form.current}
          onChangeText={(v) => set('current', v)}
          secureTextEntry
        />
        <Input
          label="New password"
          value={form.next}
          onChangeText={(v) => set('next', v)}
          secureTextEntry
        />
        <Input
          label="Confirm new password"
          value={form.confirm}
          onChangeText={(v) => set('confirm', v)}
          secureTextEntry
        />
        {status ? (
          <Text style={[s.status, status.type === 'ok' ? s.ok : s.err, { marginBottom: 0 }]}>
            {status.text}
          </Text>
        ) : null}
        <Button
          title="Change password"
          variant="outline"
          loading={saving}
          disabled={!form.current || !form.next || !form.confirm}
          onPress={submit}
        />
      </View>
    </Card>
  );
}
