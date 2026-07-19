// Theme 1 Promotions — live offers driven by the product admin's Bonuses panel.
// Signed-in players can redeem promo-code bonuses here.

import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/auth';
import { usePromotions } from '../../../hooks/usePromotions';
import { useThemedStyles } from '../../useThemedStyles';
import { inr } from '../../../lib/format';
import { radius, spacing, typography } from '../../palettes';
import { Badge, Button, Card, EmptyState, Input, Skeleton, useTabBarSpacer } from '../components/ui';

// Map a bonus type to a short tag label + the most sensible call-to-action.
const TYPE_LABEL = {
  joining: 'Welcome',
  deposit: 'Deposit',
  referral: 'Referral',
  game: 'Play',
  cashback: 'Cashback',
  no_deposit: 'Free',
  free_spins: 'Free spins',
  loyalty: 'VIP',
  reload: 'Reload',
  manual: 'Special',
};

function rewardText(p) {
  if (p.value_type === 'percentage') {
    const cap = p.max_bonus_cap ? ` up to ${inr(p.max_bonus_cap)}` : '';
    return `${p.value_amount}% bonus${cap}`;
  }
  return `${inr(p.value_amount)} bonus`;
}

function ctaFor(p) {
  if (p.bonus_type === 'deposit' || p.bonus_type === 'reload') {
    return { label: 'Deposit now', to: 'deposit' };
  }
  if (p.bonus_type === 'referral') return { label: 'Invite friends', to: 'refer' };
  return { label: 'View wallet', to: 'wallet' };
}

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg },
  content: { padding: spacing.lg },
  intro: { ...typography.body, color: t.muted, marginBottom: spacing.lg },
  claim: { padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.md },
  msg: {
    ...typography.body,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  msgOk: { color: t.emerald[400], borderColor: t.emerald[500] + '33', backgroundColor: t.emerald[500] + '1a' },
  msgErr: { color: t.danger[400], borderColor: t.danger[500] + '33', backgroundColor: t.danger[500] + '1a' },
  promo: { padding: spacing.xl, marginBottom: spacing.md },
  title: { ...typography.section, color: t.appFg, marginTop: spacing.md },
  reward: { ...typography.body, color: t.brand[300], fontWeight: '700', marginTop: 4 },
  desc: { ...typography.body, color: t.muted, marginTop: 4, lineHeight: 20 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  metaItem: { ...typography.caption, color: t.muted },
  metaCode: { color: t.brand[400] },
  footer: { ...typography.caption, color: t.muted, textAlign: 'center', marginTop: spacing.lg },
});

export default function Theme1Promotions({ navigation }) {
  const s = useThemedStyles(styles);
  const spacer = useTabBarSpacer();
  const { promotions, loading } = usePromotions();
  const token = useAuthStore((st) => st.token);

  const [code, setCode] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [msg, setMsg] = useState(null);

  const claim = async () => {
    if (!code.trim()) return;
    setClaiming(true);
    setMsg(null);
    try {
      const res = await api('/api/v1/bonuses/claim', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      });
      setMsg({
        type: 'ok',
        text: `${res.title} claimed — ${inr(res.amount)} added to your bonus balance.`,
      });
      setCode('');
    } catch (err) {
      setMsg({ type: 'err', text: err?.message ?? 'Could not claim this code.' });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.intro}>Live offers and bonuses. Terms &amp; wagering requirements apply.</Text>

      {token ? (
        <Card style={s.claim}>
          <Input
            label="Have a promo code?"
            icon="ticket-outline"
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            placeholder="e.g. WELCOME100"
            autoCapitalize="characters"
            maxLength={40}
          />
          <Button
            title="Claim"
            loading={claiming}
            disabled={!code.trim()}
            onPress={claim}
          />
        </Card>
      ) : null}

      {msg ? (
        <Text style={[s.msg, msg.type === 'ok' ? s.msgOk : s.msgErr]}>{msg.text}</Text>
      ) : null}

      {loading ? (
        <View style={{ gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={150} />
          ))}
        </View>
      ) : promotions.length === 0 ? (
        <EmptyState
          icon="gift"
          title="No active promotions right now"
          text="Check back soon for new bonuses and offers."
        />
      ) : (
        promotions.map((p) => {
          const cta = ctaFor(p);
          return (
            <Card key={p.id} glow style={s.promo}>
              <Badge>{TYPE_LABEL[p.bonus_type] || 'Bonus'}</Badge>
              <Text style={s.title}>{p.title}</Text>
              <Text style={s.reward}>{rewardText(p)}</Text>
              {p.description ? <Text style={s.desc}>{p.description}</Text> : null}
              <View style={s.meta}>
                {p.min_deposit > 0 ? (
                  <Text style={s.metaItem}>Min deposit {inr(p.min_deposit)}</Text>
                ) : null}
                {p.wagering_multiplier > 0 ? (
                  <Text style={s.metaItem}>Wagering {p.wagering_multiplier}×</Text>
                ) : null}
                {p.has_promo_code ? (
                  <Text style={[s.metaItem, s.metaCode]}>Promo code required</Text>
                ) : null}
              </View>
              <Button
                title={cta.label}
                size="small"
                onPress={() => navigation.navigate(cta.to)}
                style={{ alignSelf: 'flex-start', marginTop: spacing.lg }}
              />
            </Card>
          );
        })
      )}

      <Text style={s.footer}>Bonuses are subject to our rules &amp; bonus policy.</Text>
      <View style={spacer} />
    </ScrollView>
  );
}
