import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { MenuRow } from '../components/MenuRow';
import { EmptyState } from '../components/EmptyState';
import { useAuthStore } from '../store/auth';
import { colors, radius, spacing } from '../theme';

export function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isDemo = useAuthStore((s) => s.isDemo);
  const logout = useAuthStore((s) => s.logout);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSession();
    setRefreshing(false);
  }, [refreshSession]);

  if (!token) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <EmptyState
          icon="person-outline"
          title="Your profile"
          message="Sign in to track bets, manage KYC, and access exclusive promotions."
          actionLabel="Sign in"
          onAction={() => navigation.navigate('Login')}
        />
        <View style={styles.guestActions}>
          <Button title="Create account" variant="secondary" onPress={() => navigation.navigate('Register')} />
        </View>
      </View>
    );
  }

  const initials = (user?.full_name ?? user?.username ?? 'P')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const kycVerified = user?.kyc_status === 'verified';

  return (
    <ScrollView
      style={styles.flex}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand400} />
      }
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
          {isDemo ? (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>DEMO</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.handle}>@{user?.username}</Text>
        <View style={styles.levelRow}>
          <Icon name="star" size={14} color={colors.brand400} />
          <Text style={styles.level}>{user?.level ?? 'Member'}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.memberSince}>
            Since {new Date(user?.member_since ?? Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatBox label="Total bets" value={String(user?.total_bets ?? 0)} />
        <StatBox label="Wins" value={String(user?.total_wins ?? 0)} />
        <StatBox label="Referrals" value="0" />
      </View>

      <Card style={styles.kycCard}>
        <View style={styles.kycRow}>
          <Icon
            name={kycVerified ? 'shield-checkmark' : 'shield-outline'}
            size={24}
            color={kycVerified ? colors.green : colors.orange}
          />
          <View style={styles.kycText}>
            <Text style={styles.kycTitle}>KYC {kycVerified ? 'Verified' : 'Pending'}</Text>
            <Text style={styles.kycSub}>
              {kycVerified ? 'Full withdrawal limits unlocked' : 'Complete verification to withdraw'}
            </Text>
          </View>
          {!kycVerified ? (
            <Pressable
              style={styles.verifyBtn}
              onPress={() => Alert.alert('KYC', 'Demo: KYC marked as verified on next login.')}
            >
              <Text style={styles.verifyBtnText}>Verify</Text>
            </Pressable>
          ) : null}
        </View>
      </Card>

      <Text style={styles.sectionLabel}>Account</Text>
      <Card style={styles.menuCard}>
        <MenuRow icon="person-outline" label="Edit profile" onPress={() => navigation.navigate('EditProfile')} />
        <MenuRow icon="wallet-outline" label="Wallet" onPress={() => navigation.navigate('Wallet')} />
        <MenuRow icon="list-outline" label="Transactions" onPress={() => navigation.navigate('Transactions')} />
        <MenuRow icon="gift-outline" label="Promotions" onPress={() => navigation.navigate('Promotions')} />
      </Card>

      <Text style={styles.sectionLabel}>Support</Text>
      <Card style={styles.menuCard}>
        <MenuRow icon="headset-outline" label="Help & chat" onPress={() => navigation.navigate('Support')} />
        <MenuRow icon="settings-outline" label="Settings" onPress={() => navigation.navigate('Settings')} />
      </Card>

      <Card style={styles.infoCard}>
        <InfoRow icon="call-outline" label="Phone" value={user?.phone} />
        <InfoRow icon="mail-outline" label="Email" value={user?.email} />
        <InfoRow icon="key-outline" label="Referral code" value={user?.referral_code} copyable />
      </Card>

      <Button
        title="Sign out"
        variant="secondary"
        onPress={() => {
          Alert.alert('Sign out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: logout },
          ]);
        }}
        style={styles.logout}
      />
    </ScrollView>
  );
}

function StatBox({ label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, copyable }) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={18} color={colors.textDim} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Pressable
        disabled={!copyable}
        onPress={() => copyable && Alert.alert('Copied', `${value} copied`)}
      >
        <Text style={styles.infoValue}>{value ?? '—'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  guestActions: { padding: spacing.lg, paddingTop: 0 },
  profileHeader: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.surface700,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.background },
  demoBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: colors.surface600,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoBadgeText: { color: colors.brand300, fontSize: 9, fontWeight: '800' },
  name: { fontSize: 24, fontWeight: '800', color: colors.text },
  handle: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 4 },
  level: { color: colors.brand400, fontWeight: '600', fontSize: 13 },
  dot: { color: colors.textDim },
  memberSince: { color: colors.textDim, fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface800,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  kycCard: { marginBottom: spacing.lg },
  kycRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  kycText: { flex: 1 },
  kycTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  kycSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  verifyBtn: {
    backgroundColor: colors.brand500,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  verifyBtnText: { color: colors.background, fontWeight: '700', fontSize: 12 },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuCard: { padding: 0, overflow: 'hidden', marginBottom: spacing.lg },
  infoCard: { gap: spacing.md, marginBottom: spacing.lg },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoLabel: { flex: 1, color: colors.textMuted, fontSize: 14 },
  infoValue: { color: colors.text, fontWeight: '600', fontSize: 14 },
  logout: { borderColor: colors.red },
});
