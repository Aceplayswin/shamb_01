import 'react-native-gesture-handler';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { BrandingProvider } from './src/branding';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e17" translucent />
      <BrandingProvider>
        <RootNavigator />
      </BrandingProvider>
    </SafeAreaProvider>
  );
}

export default App;
