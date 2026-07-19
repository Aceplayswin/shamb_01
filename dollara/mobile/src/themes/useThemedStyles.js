import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useBranding';

// Build a StyleSheet from the active palette, rebuilt only when the palette
// changes. Lets themed components keep StyleSheet's flattening/caching instead
// of allocating inline style objects on every render.
//
//   const makeStyles = (t) => ({ card: { backgroundColor: t.panel } });
//   const s = useThemedStyles(makeStyles);
export function useThemedStyles(factory) {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [factory, theme]);
}
