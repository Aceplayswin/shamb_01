import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BrandProvider } from './src/hooks/useBranding';
import { RootNavigator } from './src/navigation/RootNavigator';

// BrandProvider must sit above the navigator: it resolves this product's
// branding AND the theme key the navigator uses to pick which theme renders the
// app.
function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BrandProvider>
        <RootNavigator />
      </BrandProvider>
    </SafeAreaProvider>
  );
}

export default App;
