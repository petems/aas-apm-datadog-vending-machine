import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscriptions, useAppServices, useDatadogDeployment } from '../useAzureApi';
import { AzureService } from '../../services/azureService';
import { mockSubscription, mockAppService } from '../../__tests__/helpers';

// Mock the Azure service
jest.mock('../../services/azureService');
const MockedAzureService = AzureService as jest.MockedClass<typeof AzureService>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useAzureApi hooks', () => {
  const mockAccessToken = 'mock-access-token';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useSubscriptions', () => {
    it('should fetch subscriptions successfully', async () => {
      const mockGetSubscriptions = jest.fn().mockResolvedValue([mockSubscription]);
      MockedAzureService.mockImplementation(() => ({
        getSubscriptions: mockGetSubscriptions,
      } as any));

      const { result } = renderHook(
        () => useSubscriptions(mockAccessToken),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockSubscription]);
      expect(mockGetSubscriptions).toHaveBeenCalled();
    });

    it('should not fetch when access token is null', async () => {
      const { result } = renderHook(
        () => useSubscriptions(null),
        { wrapper: createWrapper() }
      );

      // Wait for initial render to settle
      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });

    it('should handle fetch errors', async () => {
      const mockGetSubscriptions = jest.fn().mockRejectedValue(
        new Error('Failed to fetch subscriptions')
      );
      MockedAzureService.mockImplementation(() => ({
        getSubscriptions: mockGetSubscriptions,
      } as any));

      const { result } = renderHook(
        () => useSubscriptions(mockAccessToken),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 3000 });

      expect(result.current.error).toBeTruthy();
      expect(mockGetSubscriptions).toHaveBeenCalled();
    });
  });

  describe('useAppServices', () => {
    const mockSubscriptionId = 'test-subscription-id';

    it('should fetch app services successfully', async () => {
      const mockGetAppServices = jest.fn().mockResolvedValue([mockAppService]);
      MockedAzureService.mockImplementation(() => ({
        getAppServices: mockGetAppServices,
      } as any));

      const { result } = renderHook(
        () => useAppServices(mockAccessToken, mockSubscriptionId),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockAppService]);
      expect(mockGetAppServices).toHaveBeenCalledWith(mockSubscriptionId);
    });

    it('should not fetch when subscription ID is null', async () => {
      const { result } = renderHook(
        () => useAppServices(mockAccessToken, null),
        { wrapper: createWrapper() }
      );

      // Wait for initial render to settle
      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });

    it('should handle subscription change', async () => {
      const mockGetAppServices = jest.fn().mockResolvedValue([mockAppService]);
      MockedAzureService.mockImplementation(() => ({
        getAppServices: mockGetAppServices,
      } as any));

      const { result, rerender } = renderHook(
        ({ subscriptionId }) => useAppServices(mockAccessToken, subscriptionId),
        { 
          wrapper: createWrapper(),
          initialProps: { subscriptionId: 'subscription-1' }
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Change subscription
      rerender({ subscriptionId: 'subscription-2' });

      await waitFor(() => {
        expect(mockGetAppServices).toHaveBeenCalledWith('subscription-2');
      });
    });
  });

  describe('useDatadogDeployment', () => {
    it('should deploy successfully', async () => {
      const mockDeploy = jest.fn().mockResolvedValue({ success: true });
      MockedAzureService.mockImplementation(() => ({
        deployDatadogAPM: mockDeploy,
      } as any));

      const { result } = renderHook(
        () => useDatadogDeployment(mockAccessToken),
        { wrapper: createWrapper() }
      );

      const deploymentParams = {
        subscriptionId: 'test-sub',
        resourceGroupName: 'test-rg',
        deploymentName: 'test-deployment',
        templateUri: 'https://example.com/template.json',
        parameters: {
          siteName: 'test-site',
          location: 'East US',
          ddApiKey: 'test-api-key',
          ddSite: 'datadoghq.com',
        },
      };

      await result.current.mutateAsync(deploymentParams);

      expect(mockDeploy).toHaveBeenCalledWith(
        'test-sub',
        'test-rg',
        'test-deployment',
        'https://example.com/template.json',
        deploymentParams.parameters
      );
    });

    it('should handle deployment errors', async () => {
      const mockDeploy = jest.fn().mockRejectedValue(
        new Error('Deployment failed')
      );
      MockedAzureService.mockImplementation(() => ({
        deployDatadogAPM: mockDeploy,
      } as any));

      const { result } = renderHook(
        () => useDatadogDeployment(mockAccessToken),
        { wrapper: createWrapper() }
      );

      const deploymentParams = {
        subscriptionId: 'test-sub',
        resourceGroupName: 'test-rg',
        deploymentName: 'test-deployment',
        templateUri: 'https://example.com/template.json',
        parameters: {
          siteName: 'test-site',
          location: 'East US',
          ddApiKey: 'test-api-key',
          ddSite: 'datadoghq.com',
        },
      };

      let caughtError = false;
      try {
        await result.current.mutateAsync(deploymentParams);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        caughtError = true;
      }

      expect(caughtError).toBe(true);
      expect(mockDeploy).toHaveBeenCalled();
    });
  });
}); 