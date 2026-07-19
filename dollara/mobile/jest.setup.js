/* eslint-env jest */

// Native modules the app depends on, stubbed so components can render under the
// test renderer.

// In-memory AsyncStorage. (v3 no longer ships the jest mock it used to.)
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k) => Promise.resolve(k in store ? store[k] : null)),
      setItem: jest.fn((k, v) => {
        store[k] = v;
        return Promise.resolve();
      }),
      removeItem: jest.fn((k) => {
        delete store[k];
        return Promise.resolve();
      }),
      multiRemove: jest.fn((keys) => {
        keys.forEach((k) => delete store[k]);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store = {};
        return Promise.resolve();
      }),
    },
  };
});

// Vector icons pull in native font modules; a plain view stands in fine for
// render tests.
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('react-native-gesture-handler', () => ({}));

// Insets are measured natively, so the real provider renders nothing under the
// test renderer. The library's own mock resolves them synchronously.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// `useFocusEffect` needs a navigator above it. Rendering a screen in isolation
// has none, so stand it in with a plain mount effect — which is what it does on
// a screen's first focus anyway.
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const { useEffect } = require('react');
  return {
    ...actual,
    useFocusEffect: (callback) => useEffect(callback, [callback]),
  };
});

// Every screen fetches on mount. Default to an empty-but-valid payload so a
// test that doesn't care about the network still renders; individual tests
// override this.
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve([]),
  }),
);

beforeEach(() => {
  global.fetch.mockClear();
});
