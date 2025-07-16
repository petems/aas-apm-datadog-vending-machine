import '@testing-library/jest-dom';
import React from 'react';

// Mock window.location methods
Object.defineProperty(window, 'location', {
  value: {
    origin: 'https://test.github.io',
    href: 'https://test.github.io',
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
}));

jest.mock('@azure/msal-react', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const React = jest.requireActual('react');
  return {
    useMsal: jest.fn(),
    MsalProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Global test timeout
jest.setTimeout(10000);

// Suppress console errors in tests unless explicitly testing them
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
}); 