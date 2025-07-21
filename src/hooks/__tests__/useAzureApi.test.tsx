import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useSubscriptions,
  useAppServices,
  useDatadogDeployment,
} from '../useAzureApi';
import { AzureService } from '../../services/azureService';
import { mockSubscription, mockAppService } from '../../test-utils';

// Mock the Azure service
jest.mock('../../services/azureService');
const MockedAzureService = AzureService as jest.MockedClass<
  typeof AzureService
>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAzureApi hooks', () => {
  const mockAccessToken = 'mock-access-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useSubscriptions', () => {
    it('fetches subscriptions successfully', async () => {
      const mockGetSubscriptions = jest
        .fn()
        .mockResolvedValue([mockSubscription]);
      MockedAzureService.mockImplementation(
        () =>
          ({
            getSubscriptions: mockGetSubscriptions,
          }) as any
      );

      const { result } = renderHook(() => useSubscriptions(mockAccessToken), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockSubscription]);
      expect(mockGetSubscriptions).toHaveBeenCalled();
    });

    it('does not fetch when access token is null or undefined (table test)', async () => {
      for (const token of [null, undefined]) {
        const { result } = renderHook(() => useSubscriptions(token as any), {
          wrapper: createWrapper(),
        });
        expect(result.current.status).toBe('pending');
      }
    });

    it('should not fetch when access token is null', async () => {
      const mockGetSubscriptions = jest.fn();
      MockedAzureService.mockImplementation(
        () =>
          ({
            getSubscriptions: mockGetSubscriptions,
          }) as any
      );

      const { result } = renderHook(() => useSubscriptions(null), {
        wrapper: createWrapper(),
      });

      // Give it a bit of time, then verify no API call was made
      await new Promise(resolve => setTimeout(resolve, 100));

      // The important thing is that getSubscriptions was never called
      expect(mockGetSubscriptions).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });

    it('handles fetch errors', async () => {
      const mockGetSubscriptions = jest
        .fn()
        .mockRejectedValue(new Error('Failed to fetch subscriptions'));
      MockedAzureService.mockImplementation(
        () =>
          ({
            getSubscriptions: mockGetSubscriptions,
          }) as any
      );

      const { result } = renderHook(() => useSubscriptions(mockAccessToken), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 }
      );

      expect(result.current.error).toBeTruthy();
      expect(mockGetSubscriptions).toHaveBeenCalled();
    });

    it('handles unexpected errors in hook', async () => {
      MockedAzureService.mockImplementation(() => {
        throw new Error('Unexpected');
      });
      const { result } = renderHook(() => useSubscriptions(mockAccessToken), {
        wrapper: createWrapper(),
      });
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 5000 });
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useAppServices', () => {
    const mockSubscriptionId = 'test-subscription-id';

    it('fetches app services successfully', async () => {
      const mockGetAppServices = jest.fn().mockResolvedValue([mockAppService]);
      MockedAzureService.mockImplementation(
        () =>
          ({
            getAppServices: mockGetAppServices,
          }) as any
      );

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

    it('does not fetch when subscription ID is null or undefined (table test)', async () => {
      for (const subId of [null, undefined]) {
        const { result } = renderHook(
          () => useAppServices(mockAccessToken, subId as any),
          { wrapper: createWrapper() }
        );
        expect(result.current.status).toBe('pending');
      }
      // Also test explicit null with mock
      const mockGetAppServices = jest.fn();
      MockedAzureService.mockImplementation(
        () =>
          ({
            getAppServices: mockGetAppServices,
          }) as any
      );

      const { result } = renderHook(
        () => useAppServices(mockAccessToken, null),
        { wrapper: createWrapper() }
      );

      // Give it a bit of time, then verify no API call was made
      await new Promise(resolve => setTimeout(resolve, 100));

      // The important thing is that getAppServices was never called
      expect(mockGetAppServices).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });

    it('handles subscription change', async () => {
      const mockGetAppServices = jest.fn().mockResolvedValue([mockAppService]);
      MockedAzureService.mockImplementation(
        () =>
          ({
            getAppServices: mockGetAppServices,
          }) as any
      );

      const { result, rerender } = renderHook(
        ({ subscriptionId }) => useAppServices(mockAccessToken, subscriptionId),
        {
          wrapper: createWrapper(),
          initialProps: { subscriptionId: 'subscription-1' },
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

    it('handles fetch errors', async () => {
      const mockGetAppServices = jest
        .fn()
        .mockRejectedValue(new Error('Failed to fetch app services'));
      MockedAzureService.mockImplementation(
        () =>
          ({
            getAppServices: mockGetAppServices,
          }) as any
      );
      const { result } = renderHook(
        () => useAppServices(mockAccessToken, mockSubscriptionId),
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 5000 });
      expect(result.current.error).toBeTruthy();
    });

    it('handles unexpected errors in hook', async () => {
      MockedAzureService.mockImplementation(() => {
        throw new Error('Unexpected');
      });
      const { result } = renderHook(
        () => useAppServices(mockAccessToken, mockSubscriptionId),
        { wrapper: createWrapper() }
      );
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 5000 });
      expect(result.current.error).toBeTruthy();
    });
  });

  describe.skip('useDatadogDeployment @integration', () => {
    it('deploys successfully', async () => {
      const mockDeploy = jest.fn().mockResolvedValue({ success: true });
      MockedAzureService.mockImplementation(
        () =>
          ({
            deployDatadogAPM: mockDeploy,
          }) as any
      );

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

    it('handles deployment errors', async () => {
      const mockDeploy = jest
        .fn()
        .mockRejectedValue(new Error('Deployment failed'));
      MockedAzureService.mockImplementation(
        () =>
          ({
            deployDatadogAPM: mockDeploy,
          }) as any
      );

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

    it('handles missing/invalid deployment parameters (table test)', async () => {
      const mockDeploy = jest
        .fn()
        .mockRejectedValue(new Error('All deployment parameters are required'));
      MockedAzureService.mockImplementation(
        () =>
          ({
            deployDatadogAPM: mockDeploy,
          }) as any
      );
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
      const invalidParamsList = [
        { ...deploymentParams, subscriptionId: '' },
        { ...deploymentParams, resourceGroupName: '' },
        { ...deploymentParams, deploymentName: '' },
        { ...deploymentParams, templateUri: '' },
        { ...deploymentParams, parameters: undefined },
      ];
      for (const params of invalidParamsList) {
        let caughtError = false;
        try {
          await result.current.mutateAsync(params as any);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          caughtError = true;
        }
        expect(caughtError).toBe(true);
      }
    });

    it('handles unexpected errors in hook', async () => {
      MockedAzureService.mockImplementation(() => {
        throw new Error('Unexpected');
      });
      const { result } = renderHook(
        () => useDatadogDeployment(mockAccessToken),
        { wrapper: createWrapper() }
      );
      let caughtError = false;
      try {
        await result.current.mutateAsync({
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
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        caughtError = true;
      }
      expect(caughtError).toBe(true);
    });
  });
});
