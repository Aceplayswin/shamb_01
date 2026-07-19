// In-app host for an aggregator game URL.
//
// `react-native-webview` is a native module: it only exists once the app has
// been rebuilt after installing it (npm install && pod install for iOS). Rather
// than crash on a JS-only reload, we resolve it lazily and report whether it is
// linked, so the Play screen can fall back to opening the game in the device
// browser. Both routes are valid — the aggregator settles bets server-side via
// its callback webhook either way.

import React from 'react';

let WebViewImpl = null;
try {
  // eslint-disable-next-line global-require
  WebViewImpl = require('react-native-webview').WebView;
} catch {
  WebViewImpl = null;
}

export const hasWebView = Boolean(WebViewImpl);

export function GameWebView({ uri, onLoadEnd, style }) {
  if (!WebViewImpl) return null;
  return (
    <WebViewImpl
      source={{ uri }}
      style={style}
      onLoadEnd={onLoadEnd}
      // Games are canvas/WebGL heavy and often open a payment or provider popup.
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      setSupportMultipleWindows={false}
      allowsBackForwardNavigationGestures={false}
      startInLoadingState
    />
  );
}
