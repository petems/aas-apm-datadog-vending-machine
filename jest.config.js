module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Handle ESM imports from react-syntax-highlighter
    '^react-syntax-highlighter/dist/esm/(.*)$': 'react-syntax-highlighter/dist/cjs/$1',
    // Mock react-router-dom
    '^react-router-dom$': '<rootDir>/src/__mocks__/react-router-dom.js',
    // Mock Azure SDK modules that cause issues in tests
    '^@azure/logger$': '<rootDir>/src/__mocks__/@azure/logger.js',
    '^@azure/core-rest-pipeline$': '<rootDir>/src/__mocks__/@azure/core-rest-pipeline.js',
    '^@azure/core-client$': '<rootDir>/src/__mocks__/@azure/core-client.js',
    '^@azure/arm-appservice$': '<rootDir>/src/__mocks__/@azure/arm-appservice.js',
    '^@azure/arm-resources$': '<rootDir>/src/__mocks__/@azure/arm-resources.js',
    '^@azure/identity$': '<rootDir>/src/__mocks__/@azure/identity.js',
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
}; 