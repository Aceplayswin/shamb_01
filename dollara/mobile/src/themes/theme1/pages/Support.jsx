// Theme 1 Support — the AI assistant chat (/api/v1/ai/chat).

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../components/Icon';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/auth';
import { useBranding, useTheme } from '../../../hooks/useBranding';
import { useThemedStyles } from '../../useThemedStyles';
import { radius, spacing, typography } from '../../palettes';

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg },
  list: { padding: spacing.lg, gap: spacing.md },
  bubble: { maxWidth: '85%', borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: 11 },
  bot: { alignSelf: 'flex-start', backgroundColor: t.surface[700], borderTopLeftRadius: 4 },
  user: { alignSelf: 'flex-end', backgroundColor: t.brand[500], borderTopRightRadius: 4 },
  botText: { ...typography.body, color: t.appFg, lineHeight: 20 },
  userText: { ...typography.body, color: t.surface[950], fontWeight: '600', lineHeight: 20 },
  typing: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  typingText: { ...typography.caption, color: t.muted },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.hairline(0.08),
    backgroundColor: t.rail,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    color: t.appFg,
    fontSize: 15,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.hairline(0.1),
    backgroundColor: t.panelA(0.6),
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.brand[500],
  },
  sendDisabled: { opacity: 0.5 },
  loginNote: { ...typography.caption, color: t.muted, textAlign: 'center', paddingBottom: spacing.md },
  link: { color: t.brand[400], fontWeight: '700' },
});

export default function Theme1Support({ navigation }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const branding = useBranding();
  const token = useAuthStore((st) => st.token);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Seed the greeting once branding has resolved, so it isn't stuck on an empty
  // product name from the first render.
  useEffect(() => {
    setMessages([
      {
        role: 'bot',
        text: `Hi! I'm your ${branding.product_name || 'support'} assistant. How can I help?`,
      },
    ]);
  }, [branding.product_name]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setInput('');

    if (!token) {
      setMessages((m) => [...m, { role: 'bot', text: 'Please log in to use support chat.' }]);
      return;
    }

    setLoading(true);
    try {
      const res = await api('/api/v1/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: msg }),
      });
      setMessages((m) => [...m, { role: 'bot', text: res.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'bot', text: e.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 56}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.list}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m, i) => (
          <View key={i} style={[s.bubble, m.role === 'user' ? s.user : s.bot]}>
            <Text style={m.role === 'user' ? s.userText : s.botText}>{m.text}</Text>
          </View>
        ))}
        {loading ? (
          <View style={s.typing}>
            <ActivityIndicator size="small" color={t.brand[400]} />
            <Text style={s.typingText}>Assistant is typing…</Text>
          </View>
        ) : null}
      </ScrollView>

      {!token ? (
        <Text style={s.loginNote}>
          <Text onPress={() => navigation.navigate('login')} style={s.link}>
            Log in
          </Text>{' '}
          for full support
        </Text>
      ) : null}

      <View style={[s.composer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message…"
          placeholderTextColor={t.muted}
          style={s.input}
          multiline
          onSubmitEditing={send}
        />
        <Pressable
          onPress={send}
          disabled={!input.trim() || loading}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={[s.send, (!input.trim() || loading) && s.sendDisabled]}
        >
          <Icon name="send" size={18} color={t.surface[950]} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
