// White-label build/runtime configuration for the mobile app.
//
// The same React Native codebase ships every product (Dollara, Product B, ...).
// Per-product builds differ only by these values. For CI flavors you can wire
// `react-native-config` and expose the same keys via `process.env`; until then
// edit the defaults below or set them at build time.
//
// Everything else about a product — its name, logo, colors and which theme it
// renders — is fetched at runtime from the API's keyless branding/theme
// endpoints (see services/tenant.js), not baked in here.

import { Platform } from 'react-native';

const ENV = (typeof process !== 'undefined' && process.env) || {};

// Android emulators reach the host machine at 10.0.2.2, not localhost. On a
// physical device set API_URL to your machine's LAN IP.
const DEFAULT_API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

// The product API identifies itself from its own api_key, so the app sends no
// tenant — this build simply points at that product's API_URL.
export const API_URL = ENV.API_URL || DEFAULT_API_URL;
