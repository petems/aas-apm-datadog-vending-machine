module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^react-syntax-highlighter/dist/esm/(.*)$': 'react-syntax-highlighter/dist/cjs/$1',
  },
  moduleDirectories: ['node_modules', 'src'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(test|spec).{ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{ts,tsx}',
  ],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-syntax-highlighter)/)',
  ],
  testTimeout: 10000,
};