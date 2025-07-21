// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
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

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
  Routes: ({ children }: { children: React.ReactNode }) => children,
  Route: ({ children }: { children: React.ReactNode }) => children,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => children,
  NavLink: ({ children, to }: { children: React.ReactNode; to: string }) => children,
  Outlet: () => null,
  Navigate: ({ to }: { to: string }) => null,
}));

// Mock Azure SDK modules
jest.mock('@azure/logger', () => ({
  createClientLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
  setLogLevel: jest.fn(),
  LogLevel: {
    VERBOSE: 0,
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
  },
}));

jest.mock('@azure/core-rest-pipeline', () => ({
  createPipelineFromOptions: jest.fn(() => ({
    addPolicy: jest.fn(),
    sendRequest: jest.fn(),
  })),
  createHttpHeaders: jest.fn(() => ({})),
  createPipelineRequest: jest.fn(() => ({})),
  RestError: class RestError extends Error {
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

jest.mock('@azure/core-client', () => ({
  ServiceClient: class ServiceClient {
    constructor() {
      this.pipeline = {
        sendRequest: jest.fn(),
      };
    }
  },
  createClientLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('@azure/arm-appservice', () => ({
  WebSiteManagementClient: class WebSiteManagementClient {
    constructor() {
      this.webApps = {
        get: jest.fn(),
        update: jest.fn(),
        list: jest.fn(),
        getConfiguration: jest.fn(),
        updateConfiguration: jest.fn(),
        updateApplicationSettings: jest.fn(),
        getApplicationSettings: jest.fn(),
        listApplicationSettings: jest.fn(),
      };
      this.appServicePlans = {
        get: jest.fn(),
        list: jest.fn(),
      };
      this.resourceGroups = {
        get: jest.fn(),
        list: jest.fn(),
      };
    }
  },
}));

jest.mock('@azure/arm-resources', () => ({
  ResourceManagementClient: class ResourceManagementClient {
    constructor() {
      this.resourceGroups = {
        get: jest.fn(),
        list: jest.fn(),
        createOrUpdate: jest.fn(),
        delete: jest.fn(),
      };
      this.resources = {
        get: jest.fn(),
        list: jest.fn(),
        createOrUpdate: jest.fn(),
        delete: jest.fn(),
      };
      this.deployments = {
        get: jest.fn(),
        list: jest.fn(),
        createOrUpdate: jest.fn(),
        validate: jest.fn(),
      };
    }
  },
}));

jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: class DefaultAzureCredential {
    constructor() {
      this.getToken = jest.fn();
    }
  },
  ClientSecretCredential: class ClientSecretCredential {
    constructor() {
      this.getToken = jest.fn();
    }
  },
  InteractiveBrowserCredential: class InteractiveBrowserCredential {
    constructor() {
      this.getToken = jest.fn();
    }
  },
  TokenCredential: class TokenCredential {
    getToken() {
      return Promise.resolve({ token: 'mock-token', expiresOnTimestamp: Date.now() + 3600000 });
    }
  },
}));

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

// Suppress console errors in tests
const originalError = console.error;
console.error = (...args: any[]) => {
  // Suppress specific error messages that are expected in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
      args[0].includes('Warning: useLayoutEffect does nothing on the server') ||
      args[0].includes('Warning: An invalid form control') ||
      args[0].includes('Warning: validateDOMNesting') ||
      args[0].includes('Warning: Each child in a list should have a unique "key" prop') ||
      args[0].includes('Warning: componentWillReceiveProps has been renamed') ||
      args[0].includes('Warning: componentWillUpdate has been renamed') ||
      args[0].includes('Warning: componentWillMount has been renamed') ||
      args[0].includes('Warning: Failed prop type') ||
      args[0].includes('Warning: Invalid DOM property') ||
      args[0].includes('Warning: Unknown event handler property') ||
      args[0].includes('Warning: React does not recognize the') ||
      args[0].includes('Warning: validateDOMNesting') ||
      args[0].includes('Warning: findDOMNode is deprecated') ||
      args[0].includes('Warning: componentWillReceiveProps has been renamed') ||
      args[0].includes('Warning: componentWillUpdate has been renamed') ||
      args[0].includes('Warning: componentWillMount has been renamed') ||
      args[0].includes('Warning: Failed prop type') ||
      args[0].includes('Warning: Invalid DOM property') ||
      args[0].includes('Warning: Unknown event handler property') ||
      args[0].includes('Warning: React does not recognize the') ||
      args[0].includes('Warning: validateDOMNesting') ||
      args[0].includes('Warning: findDOMNode is deprecated'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};
