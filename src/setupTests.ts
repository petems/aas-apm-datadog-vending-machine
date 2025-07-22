import '@testing-library/jest-dom';
import React from 'react';

// Mock window.location methods
Object.defineProperty(window, 'location', {
  value: {
    origin: 'https://test.github.io',
    href: 'https://test.github.io',
    pathname: '/',
  },
  writable: true,
});

// Mock Azure MSAL
jest.mock('@azure/msal-browser', () => ({
  PublicClientApplication: jest.fn().mockImplementation(() => ({
    acquireTokenSilent: jest.fn(),
    acquireTokenPopup: jest.fn(),
    loginPopup: jest.fn(),
    logoutPopup: jest.fn(),
  })),
  LogLevel: {
    Error: 0,
    Warning: 1,
    Info: 2,
    Verbose: 3,
    Trace: 4,
  },
}));

// Mock Azure logger to avoid ESM resolution issues in tests
jest.mock('@azure/logger', () => ({
  createClientLogger: jest.fn(() => ({
    info: jest.fn(),
    verbose: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  })),
  AzureLogger: {
    info: jest.fn(),
    verbose: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  },
  setLogLevel: jest.fn(),
}));

jest.mock('@azure/msal-react', () => {
  return {
    useMsal: jest.fn(),
    MsalProvider: jest.fn().mockImplementation((props) => props.children),
  };
});

// Mock Azure SDK modules to avoid ESM loading issues during tests
jest.mock('@azure/arm-appservice', () => ({
  WebSiteManagementClient: jest.fn().mockImplementation(() => ({
    webApps: {},
    appServicePlans: {},
  })),
}));

jest.mock('@azure/arm-resources', () => ({
  ResourceManagementClient: jest.fn().mockImplementation(() => ({
    resourceGroups: {},
  })),
}));

jest.mock('@azure/identity', () => ({
  InteractiveBrowserCredential: jest.fn(),
}));

// Global test timeout
jest.setTimeout(10000);

// Suppress console errors in tests unless explicitly testing them
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: An update to') ||
       args[0].includes('act(...)'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
