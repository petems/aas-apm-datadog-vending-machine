import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AzureService, AzureApiError } from '../services/azureService';
import {
  AzureSubscription,
  AzureAppService,
  DeploymentParameters,
} from '../types';

// Query keys
const QUERY_KEYS = {
  subscriptions: ['azure', 'subscriptions'] as const,
  appServices: (subscriptionId: string) =>
    ['azure', 'appServices', subscriptionId] as const,
  appServiceDetails: (
    subscriptionId: string,
    resourceGroup: string,
    siteName: string
  ) =>
    [
      'azure',
      'appServiceDetails',
      subscriptionId,
      resourceGroup,
      siteName,
    ] as const,
};

// Hook for fetching subscriptions
export const useSubscriptions = (accessToken: string | null) => {
  return useQuery({
    queryKey: QUERY_KEYS.subscriptions,
    queryFn: async (): Promise<AzureSubscription[]> => {
      if (!accessToken) throw new Error('No access token available');
      try {
        const azureService = new AzureService(accessToken);
        return azureService.getSubscriptions();
      } catch (error) {
        throw error;
      }
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error instanceof AzureApiError && error.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Hook for fetching app services
export const useAppServices = (
  accessToken: string | null,
  subscriptionId: string | null
) => {
  return useQuery({
    queryKey: QUERY_KEYS.appServices(subscriptionId || ''),
    queryFn: async (): Promise<AzureAppService[]> => {
      if (!accessToken || !subscriptionId) {
        throw new Error('Access token and subscription ID are required');
      }
      try {
        const azureService = new AzureService(accessToken);
        return azureService.getAppServices(subscriptionId);
      } catch (error) {
        throw error;
      }
    },
    enabled: !!accessToken && !!subscriptionId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      if (error instanceof AzureApiError && error.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

// Hook for app service details
export const useAppServiceDetails = (
  accessToken: string | null,
  subscriptionId: string | null,
  resourceGroup: string | null,
  siteName: string | null
) => {
  return useQuery({
    queryKey: QUERY_KEYS.appServiceDetails(
      subscriptionId || '',
      resourceGroup || '',
      siteName || ''
    ),
    queryFn: async (): Promise<AzureAppService> => {
      if (!accessToken || !subscriptionId || !resourceGroup || !siteName) {
        throw new Error('All parameters are required');
      }
      const azureService = new AzureService(accessToken);
      return azureService.getAppServiceDetails(
        subscriptionId,
        resourceGroup,
        siteName
      );
    },
    enabled: !!accessToken && !!subscriptionId && !!resourceGroup && !!siteName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for deploying Datadog APM
export const useDatadogDeployment = (accessToken: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      subscriptionId: string;
      resourceGroupName: string;
      deploymentName: string;
      templateUri: string;
      parameters: DeploymentParameters;
    }) => {
      if (!accessToken) throw new Error('No access token available');

      const azureService = new AzureService(accessToken);
      return azureService.deployDatadogAPM(
        params.subscriptionId,
        params.resourceGroupName,
        params.deploymentName,
        params.templateUri,
        params.parameters
      );
    },
    onSuccess: () => {
      // Invalidate related queries on successful deployment
      queryClient.invalidateQueries({
        queryKey: ['azure'],
      });
    },
    retry: (failureCount, error) => {
      // Don't retry auth errors or client errors
      if (
        error instanceof AzureApiError &&
        (error.status === 401 || error.status === 400)
      ) {
        return false;
      }
      return failureCount < 1; // Only retry once for deployment
    },
  });
};

// Hook for deployment status
export const useDeploymentStatus = (
  accessToken: string | null,
  subscriptionId: string | null,
  resourceGroupName: string | null,
  deploymentName: string | null
) => {
  return useQuery({
    queryKey: [
      'azure',
      'deployment',
      subscriptionId,
      resourceGroupName,
      deploymentName,
    ],
    queryFn: async () => {
      if (
        !accessToken ||
        !subscriptionId ||
        !resourceGroupName ||
        !deploymentName
      ) {
        throw new Error('All parameters are required');
      }
      const azureService = new AzureService(accessToken);
      return azureService.getDeploymentStatus(
        subscriptionId,
        resourceGroupName,
        deploymentName
      );
    },
    enabled:
      !!accessToken &&
      !!subscriptionId &&
      !!resourceGroupName &&
      !!deploymentName,
    refetchInterval: 5000, // Poll every 5 seconds while enabled
    staleTime: 0, // Always fetch fresh data for deployment status
  });
};
