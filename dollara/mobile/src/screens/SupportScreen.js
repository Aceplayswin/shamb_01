import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Icon } from '../components/Icon';
import { useAuthStore } from '../store/auth';
import { colors, radius, spacing } from '../theme';
import { useBranding } from '../branding';

const SUGGESTIONS = ['How do I deposit?', 'Withdrawal time?', 'Welcome bonus?', 'KYC verification'];

const FAQ_REPLIES = {
  'how do i deposit?': 'Go to Wallet → Deposit, choose UPI/Bank/Crypto, enter amount (min ₹100), and confirm. Demo mode credits instantly.',
  'withdrawal time?': 'Withdrawals process in 2–24 hours. Demo mode completes in ~2 seconds after submission.',
  'welcome bonus?': 'New users get ₹1,000 bonus + 5% on first deposit up to ₹5,000. Check Promotions for active codes.',
  'kyc verification': 'Open Profile → tap Verify on the KYC card. Demo accounts are pre-verified.',
};

function getReply(message) {
  const key = message.toLowerCase().trim();
  for (const [q, a] of Object.entries(FAQ_REPLIES)) {
    if (key.includes(q.replace('?', ''))) return a;
  }
  if (key.includes('bonus')) return FAQ_REPLIES['welcome bonus?'];
  if (key.includes('withdraw')) return FAQ_REPLIES['withdrawal time?'];
  if (key.includes('deposit')) return FAQ_REPLIES['how do i deposit?'];
  return "Thanks for reaching out! For deposits, withdrawals, or bonuses, try the quick suggestions below. Our team responds within 24 hours.";
}

export function SupportScreen() {
  const token = useAuthStore((s) => s.token);
  const branding = useBranding();
  const [messages, setMessages] = useState([
    { role: 'bot', text: `Hi! I'm your ${branding.product_name} assistant. How can I help you today?` },
  ]);
  const [input, setInput] = useState('');

  const send = (text) => {
    const msg = (text || input).trim();
    if (!msg) return;

    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setInput('');

    if (!token) {
      setTimeout(() => {
        setMessages((m) => [...m, { role: 'bot', text: 'Please sign in for account-specific help. General FAQs still work!' }]);
      }, 400);
      return;
    }

    setTimeout(() => {
      setMessages((m) => [...m, { role: 'bot', text: getReply(msg) }]);
    }, 600);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.botBubble]}>
            {item.role === 'bot' ? (
              <Icon name="chatbubble-ellipses" size={14} color={colors.brand400} style={styles.botIcon} />
            ) : null}
            <Text style={[styles.bubbleText, item.role === 'user' && styles.userText]}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.suggestions}>
        {SUGGESTIONS.map((s) => (
          <Pressable key={s} style={styles.chip} onPress={() => send(s)}>
            <Text style={styles.chipText}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.textDim}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send()}
        />
        <Pressable style={styles.sendBtn} onPress={() => send()}>
          <Icon name="send" size={20} color={colors.background} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  list: { flex: 1 },
  listContent: { padding: spacing.md },
  bubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.brand500,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface800,
    borderWidth: 1,
    borderColor: colors.border,
  },
  botIcon: { marginBottom: 4 },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  userText: { color: colors.background },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface700,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.brand400, fontSize: 12 },
  inputRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface700,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand500,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
