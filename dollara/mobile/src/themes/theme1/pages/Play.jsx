// Theme 1 Play.
//
// Aggregator games (those with a game_uid) auto-launch and take over the whole
// screen, the mobile equivalent of the web's full-tab redirect. Bets and wins
// are settled server-side through the aggregator's callback webhook — the client
// only opens the session and refreshes the wallet when the player exits.
//
// Games without a game_uid are in-house and settle through /api/v1/games/bet, so
// they get the stake form instead.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../../components/Icon';
import { GameWebView, hasWebView } from '../../../components/GameWebView';
import { useTheme } from '../../../hooks/useBranding';
import { useGamePlay } from '../../../hooks/useGamePlay';
import { useThemedStyles } from '../../useThemedStyles';
import { inr } from '../../../lib/format';
import { spacing, typography } from '../../palettes';
import { Button, Card, Caption, Input, Muted } from '../components/ui';

const styles = (t) => ({
  page: { flex: 1, backgroundColor: t.appBg, padding: spacing.lg },
  hero: { alignItems: 'center', paddingVertical: spacing.xxl },
  emoji: { fontSize: 52 },
  name: { ...typography.title, color: t.appFg, marginTop: spacing.md, textAlign: 'center' },
  provider: { ...typography.body, color: t.muted, marginTop: 2 },
  fair: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  fairText: { ...typography.caption, color: t.emerald[400] },
  panel: { marginTop: spacing.lg, gap: spacing.md },
  centerText: { ...typography.body, color: t.muted, textAlign: 'center' },
  error: { ...typography.body, color: t.danger[400], textAlign: 'center' },
  msg: { ...typography.body, color: t.brand[300], textAlign: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: t.appBg },

  // Full-screen game host
  gameRoot: { flex: 1, backgroundColor: '#000' },
  gameBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: t.rail,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.hairline(0.08),
  },
  gameTitle: { fontSize: 14, fontWeight: '700', color: t.appFg, flex: 1 },
  exit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exitText: { fontSize: 13, fontWeight: '700', color: t.brand[400] },
  webview: { flex: 1, backgroundColor: '#000' },
  webLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
});

export default function Theme1Play({ navigation, route }) {
  const s = useThemedStyles(styles);
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const slug = route.params?.slug;

  const {
    game,
    notFound,
    launching,
    gameUrl,
    error,
    betAmount,
    setBetAmount,
    message,
    launchGame,
    placeBet,
    closeGame,
    isAggregatorGame,
    token,
  } = useGamePlay(slug, { onRequireLogin: () => navigation.navigate('login') });

  const [webLoading, setWebLoading] = useState(true);
  const inGame = Boolean(gameUrl);

  useEffect(() => {
    if (inGame) setWebLoading(true);
  }, [inGame]);

  const exitGame = useCallback(() => {
    closeGame();
  }, [closeGame]);

  // Android hardware back leaves the game rather than the whole screen.
  useEffect(() => {
    if (!inGame) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exitGame();
      return true;
    });
    return () => sub.remove();
  }, [inGame, exitGame]);

  // Without the native WebView module, hand the session to the device browser.
  const openExternally = useCallback(() => {
    if (!gameUrl) return;
    Linking.openURL(gameUrl).catch(() => {});
    exitGame();
  }, [gameUrl, exitGame]);

  useEffect(() => {
    if (inGame && !hasWebView) openExternally();
  }, [inGame, openExternally]);

  if (notFound) {
    return (
      <View style={s.loading}>
        <Muted>Game not found.</Muted>
        <Button title="Go home" variant="outline" onPress={() => navigation.navigate('home')} />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={t.brand[400]} />
        <Muted>{launching ? 'Launching game…' : 'Loading game…'}</Muted>
      </View>
    );
  }

  // ---- Full-screen game session ----
  if (inGame && hasWebView) {
    return (
      <Modal visible animationType="slide" onRequestClose={exitGame} statusBarTranslucent>
        <View style={[s.gameRoot, { paddingTop: insets.top }]}>
          <View style={s.gameBar}>
            <Text numberOfLines={1} style={s.gameTitle}>
              {game.name}
            </Text>
            <Pressable onPress={exitGame} hitSlop={10} accessibilityRole="button" style={s.exit}>
              <Icon name="close" size={18} color={t.brand[400]} />
              <Text style={s.exitText}>Exit</Text>
            </Pressable>
          </View>
          <View style={{ flex: 1, paddingBottom: insets.bottom }}>
            <GameWebView
              uri={gameUrl}
              style={s.webview}
              onLoadEnd={() => setWebLoading(false)}
            />
            {webLoading ? (
              <View style={s.webLoading} pointerEvents="none">
                <ActivityIndicator color={t.brand[400]} size="large" />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    );
  }

  // ---- Pre-launch / in-house game ----
  return (
    <View style={s.page}>
      <Card style={s.hero}>
        <Text style={s.emoji}>{game.category === 'ai_games' ? '🤖' : '🎮'}</Text>
        <Text style={s.name}>{game.name}</Text>
        {game.provider_name ? <Text style={s.provider}>{game.provider_name}</Text> : null}
        {game.is_provably_fair ? (
          <View style={s.fair}>
            <Icon name="shield-checkmark" size={13} color={t.emerald[400]} />
            <Text style={s.fairText}>Provably Fair</Text>
          </View>
        ) : null}
      </Card>

      <Card style={s.panel}>
        {isAggregatorGame ? (
          <>
            <Text style={s.centerText}>
              {launching
                ? `Starting ${game.name}…`
                : error
                  ? 'Could not auto-launch. Tap below to retry.'
                  : `Ready to play? Launch ${game.name} now.`}
            </Text>
            {token ? (
              <Button
                title={launching ? 'Launching…' : error ? 'Retry launch' : 'Launch game'}
                loading={launching}
                onPress={launchGame}
              />
            ) : (
              <Button title="Login to play" onPress={() => navigation.navigate('login')} />
            )}
            {error ? <Text style={s.error}>{error}</Text> : null}
            {!hasWebView ? (
              <Caption style={{ textAlign: 'center' }}>
                Opens in your browser. Install react-native-webview and rebuild to play in-app.
              </Caption>
            ) : null}
          </>
        ) : (
          <>
            <Input
              label="Bet amount (₹)"
              value={betAmount}
              onChangeText={setBetAmount}
              keyboardType="numeric"
              hint={`Min ${inr(game.min_bet)} · Max ${inr(game.max_bet)}`}
            />
            {token ? (
              <Button title="Place bet" onPress={placeBet} />
            ) : (
              <Button title="Login to play" onPress={() => navigation.navigate('login')} />
            )}
            {message ? <Text style={s.msg}>{message}</Text> : null}
          </>
        )}
      </Card>
    </View>
  );
}
