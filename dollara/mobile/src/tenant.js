// White-label build/runtime configuration for the mobile app.
//
// The same React Native codebase ships every product (Dollara, Product B, ...).
// Per-product builds differ only by these values. For CI flavors you can wire
// `react-native-config` and expose the same keys via `process.env`; until then
// edit the defaults below or set them at build time.
//
// Note: on the Android emulator use http://10.0.2.2:5000 to reach a host machine API;
// on a physical device use your machine's LAN IP.

import { Platform } from 'react-native';

const ENV = (typeof process !== 'undefined' && process.env) || {};

const DEFAULT_API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
const DEFAULT_PLATFORM_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const API_URL = ENV.API_URL || DEFAULT_API_URL;
export const PLATFORM_API_URL = ENV.PLATFORM_API_URL || DEFAULT_PLATFORM_URL;
export const TENANT_SLUG = ENV.TENANT_SLUG || 'dollara';

// Fallback branding shown before the platform branding response arrives.
export const DEFAULT_BRANDING = {
  product_name: ENV.BRAND_NAME || 'Dollara',
  theme_color: ENV.BRAND_THEME_COLOR || '#ff9800',
  secondary_color: ENV.BRAND_SECONDARY_COLOR || '#a78bfa',
  logo_url: '',
  favicon_url: '',
  support_email: '',
  support_phone: '',
  terms_url: '',
  privacy_url: '',
};
