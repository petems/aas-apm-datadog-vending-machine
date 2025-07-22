module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-syntax-highlighter$': 'react-syntax-highlighter/dist/cjs',
    '^react-syntax-highlighter/(.*)$': 'react-syntax-highlighter/dist/cjs/$1',
    '^react-router-dom$': '<rootDir>/node_modules/react-router-dom/dist/index.js',
    '^@typespec/ts-http-runtime/internal/logger$': '<rootDir>/node_modules/@typespec/ts-http-runtime/dist/commonjs/logger',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
    '!src/**/__tests__/**',
    '!src/**/*.stories.{ts,tsx}',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(test|spec).{ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{ts,tsx}',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  resetMocks: true,
  restoreMocks: true,
  clearMocks: true,
  testTimeout: 15000,
  // Use the default transform from react-scripts instead of ts-jest
  // This avoids conflicts with React 19 and modern JSX transform
  transformIgnorePatterns: [
    '[/\\]node_modules[/\\](?!(react-syntax-highlighter|highlight\\.js|react-router-dom|@azure|@typespec)[/\\]).+\\.(js|jsx|mjs|cjs|ts|tsx)$',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
};
