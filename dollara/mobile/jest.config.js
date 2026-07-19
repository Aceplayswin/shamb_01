module.exports = {
  preset: '@react-native/jest-preset',
  // The RN preset only transforms js/ts/tsx. This codebase uses .jsx for every
  // component, so add it explicitly or nothing under src/ is transformed.
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$':
      '@react-native/jest-preset/jest/assetFileTransformer.js',
  },
  // These ship untranspiled ESM, so they must go through babel rather than be
  // skipped as node_modules.
  transformIgnorePatterns: [
    'node_modules/(?!(?:(jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-.*)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
