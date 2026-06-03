import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { MenuRow } from '../components/MenuRow';
import { colors, spacing } from '../theme';
import { useState } from 'react';

export function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Row label="Push notifications" value={notifications} onChange={setNotifications} />
        <Row label="Biometric login" value={biometric} onChange={setBiometric} />
      </Card>

      <Card style={styles.card}>
        <MenuRow icon="language-outline" label="Language" value="English" showChevron={false} />
        <MenuRow icon="cash-outline" label="Currency" value="INR" showChevron={false} />
        <MenuRow icon="moon-outline" label="Theme" value="Dark" showChevron={false} />
      </Card>

      <Card style={styles.card}>
        <MenuRow icon="document-text-outline" label="Terms of service" showChevron={false} />
        <MenuRow icon="shield-checkmark-outline" label="Privacy policy" showChevron={false} />
        <MenuRow icon="information-circle-outline" label="App version" value="1.0.0" showChevron={false} />
      </Card>
    </ScrollView>
  );
}

function Row({ label, value, onChange }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surface600, true: colors.brand500 }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  card: { padding: 0, overflow: 'hidden', marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.text, fontSize: 15 },
});
