/* eslint-env jest */
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';

// Mock MSAL instance
const mockMsalInstance = {
  acquireTokenSilent: jest.fn(),
  acquireTokenPopup: jest.fn(),
  loginPopup: jest.fn(),
  logoutPopup: jest.fn(),
  addEventCallback: jest.fn(),
  removeEventCallback: jest.fn(),
} as unknown as PublicClientApplication;

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: 0, // Disable caching in tests
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MsalProvider instance={mockMsalInstance}>{children}</MsalProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Helper for creating properly typed MSAL context mocks
export const createMockMsalContext = (overrides = {}) => ({
  instance: {} as any,
  accounts: [] as any,
  inProgress: 'none' as any,
  logger: {} as any,
  ...overrides,
});

// Mock data generators
export const mockSubscription = {
  subscriptionId: 'test-sub-id',
  displayName: 'Test Subscription',
  state: 'Enabled',
  tenantId: 'test-tenant-id',
};

export const mockAppService = {
  id: '/subscriptions/test-sub-id/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-app',
  name: 'test-app',
  resourceGroup: 'test-rg',
  location: 'East US',
  kind: 'app',
  properties: {
    hostNames: ['test-app.azurewebsites.net'],
    state: 'Running',
    siteConfig: {},
  },
};

export const mockLinuxAppService = {
  ...mockAppService,
  kind: 'app,linux',
  properties: {
    ...mockAppService.properties,
    siteConfig: {
      linuxFxVersion: 'NODE|18-lts',
    },
  },
};

export const mockAuthResponse = {
  accessToken: 'mock-access-token',
  account: {
    homeAccountId: 'test-account-id',
    environment: 'login.microsoftonline.com',
    tenantId: 'test-tenant-id',
    username: 'test@example.com',
    localAccountId: 'test-local-id',
    name: 'Test User',
  },
  scopes: ['https://management.azure.com/user_impersonation'],
  idToken: 'mock-id-token',
  fromCache: false,
};

export const mockAppServicePlan = {
  id: 'plan1',
  name: 'test-plan',
  location: 'East US',
  provisioningState: 'Succeeded',
  status: 'Ready',
  hostingEnvironmentProfile: {
    id: 'env1',
    name: 'env',
    type: 'type',
  },
  sku: {
    name: 'B1',
    tier: 'Basic',
    size: 'B1',
    family: 'B',
    capacity: 1,
  },
};
