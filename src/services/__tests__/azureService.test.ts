import { AzureService, AzureApiError } from '../azureService';
import {
  mockSubscription,
  mockAppService,
  mockLinuxAppService,
} from '../../test-utils';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('AzureService', () => {
  let service: AzureService;
  const mockAccessToken = 'mock-access-token';

  beforeEach(() => {
    service = new AzureService(mockAccessToken);
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('makeRequest', () => {
    it('should make successful API calls', async () => {
      const mockData = { value: [mockSubscription] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await service.getSubscriptions();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions'),
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          },
        })
      );
      expect(result).toEqual([mockSubscription]);
    });

    it('should handle API errors with proper error details', async () => {
      const errorResponse = {
        error: {
          message: 'Subscription not found',
          code: 'SubscriptionNotFound',
        },
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => errorResponse,
      } as unknown as Response);

      await expect(service.getSubscriptions()).rejects.toThrow(AzureApiError);
      await expect(service.getSubscriptions()).rejects.toThrow(
        'Subscription not found'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(service.getSubscriptions()).rejects.toThrow(AzureApiError);
      await expect(service.getSubscriptions()).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      // Mock AbortController to simulate timeout
      const mockAbortController = {
        abort: jest.fn(),
        signal: { aborted: false },
      };
      global.AbortController = jest.fn(() => mockAbortController) as any;

      // Mock fetch to throw AbortError after delay
      mockFetch.mockImplementationOnce(() => {
        // Simulate the timeout by throwing an AbortError
        const error = new DOMException('Operation was aborted', 'AbortError');
        return Promise.reject(error);
      });

      await expect(service.getSubscriptions()).rejects.toThrow(
        'Request timeout'
      );
    });
  });

  describe('getSubscriptions', () => {
    it('should fetch and return subscriptions', async () => {
      const mockData = { value: [mockSubscription] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await service.getSubscriptions();

      expect(result).toEqual([mockSubscription]);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://management.azure.com/subscriptions?api-version=2020-01-01',
        expect.any(Object)
      );
    });
  });

  describe('getAppServices', () => {
    const subscriptionId = 'test-subscription-id';

    it('should fetch and filter app services', async () => {
      const mockData = {
        value: [
          mockAppService,
          { ...mockAppService, kind: 'functionapp' },
          { ...mockAppService, kind: 'storageaccount' }, // Should be filtered out
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await service.getAppServices(subscriptionId);

      expect(result).toHaveLength(2); // storageaccount should be filtered out
      expect(result[0]).toMatchObject({
        ...mockAppService,
        resourceGroup: 'test-rg',
      });
    });

    it('should throw error for missing subscription ID', async () => {
      await expect(service.getAppServices('')).rejects.toThrow(
        'Subscription ID is required'
      );
      await expect(service.getAppServices(undefined as any)).rejects.toThrow(
        'Subscription ID is required'
      );
      await expect(service.getAppServices(null as any)).rejects.toThrow(
        'Subscription ID is required'
      );
    });

    it('should extract resource group from app service ID', async () => {
      const mockData = { value: [mockAppService] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await service.getAppServices(subscriptionId);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.resourceGroup).toBe('test-rg');
    });
  });

  describe('isWindowsAppService', () => {
    it('should identify Windows app services', () => {
      const windowsApp = { ...mockAppService, kind: 'app' };
      expect(service.isWindowsAppService(windowsApp)).toBe(true);
    });

    it('should identify Linux app services by kind', () => {
      const linuxApp = { ...mockAppService, kind: 'app,linux' };
      expect(service.isWindowsAppService(linuxApp)).toBe(false);
    });

    it('should identify Linux app services by linuxFxVersion', () => {
      expect(service.isWindowsAppService(mockLinuxAppService)).toBe(false);
    });

    it('should default to Windows when kind is missing', () => {
      const noKindApp = { ...mockAppService, kind: undefined };
      expect(service.isWindowsAppService(noKindApp as any)).toBe(true);
    });
  });

  describe('getAppServiceLanguage', () => {
    it('parses runtime info from Linux app services', () => {
      const result = service.getAppServiceLanguage(mockLinuxAppService);
      expect(result).toEqual({
        language: 'Node.js',
        version: '18-lts',
        rawRuntime: 'NODE|18-lts',
      });
    });

    it('handles unknown runtimes gracefully', () => {
      const customApp = {
        ...mockAppService,
        properties: {
          ...mockAppService.properties,
          siteConfig: { windowsFxVersion: 'CUSTOM|1.0' },
        },
      };
      const result = service.getAppServiceLanguage(customApp);
      expect(result).toEqual({
        language: 'Unknown',
        version: 'CUSTOM|1.0',
        rawRuntime: 'CUSTOM|1.0',
      });
    });
  });

  describe('getARMTemplateUri', () => {
    it('should return Windows template URI', () => {
      const uri = service.getARMTemplateUri(true);
      expect(uri).toBe(
        'https://test.github.io/arm/windows-appservice-datadog.json'
      );
    });

    it('should return Linux template URI', () => {
      const uri = service.getARMTemplateUri(false);
      expect(uri).toBe(
        'https://test.github.io/arm/linux-appservice-datadog.json'
      );
    });
  });

  describe('getAppServicePlan', () => {
    it('validates required parameters', async () => {
      await expect(
        // @ts-expect-error testing invalid params
        service.getAppServicePlan('', 'rg', 'plan')
      ).rejects.toThrow('All parameters are required');
    });

    it('fetches and maps plan details', async () => {
      const mockClient = {
        appServicePlans: {
          get: jest.fn().mockResolvedValue(mockAppServicePlan),
        },
      };
      jest
        .spyOn(service as any, 'getWebSiteClient')
        .mockReturnValue(mockClient as any);

      const result = await service.getAppServicePlan('sub', 'rg', 'plan1');

      expect(mockClient.appServicePlans.get).toHaveBeenCalledWith('rg', 'plan1');
      expect(result).toEqual({
        id: 'plan1',
        name: 'test-plan',
        location: 'East US',
        properties: {
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
        },
      });
    });
  });

  describe.skip('deployDatadogAPM @integration', () => {
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

    it('should deploy ARM template successfully', async () => {
      const mockResponse = { properties: { provisioningState: 'Succeeded' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await service.deployDatadogAPM(
        deploymentParams.subscriptionId,
        deploymentParams.resourceGroupName,
        deploymentParams.deploymentName,
        deploymentParams.templateUri,
        deploymentParams.parameters
      );

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/deployments/test-deployment'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('test-api-key'),
        })
      );
    });

    it('should validate required parameters (table test)', async () => {
      const requiredParams = [
        ['', 'rg', 'name', 'uri', deploymentParams.parameters],
        ['sub', '', 'name', 'uri', deploymentParams.parameters],
        ['sub', 'rg', '', 'uri', deploymentParams.parameters],
        ['sub', 'rg', 'name', '', deploymentParams.parameters],
        ['sub', 'rg', 'name', 'uri', undefined],
        ['sub', 'rg', 'name', 'uri', null],
      ];
      for (const params of requiredParams) {
        await expect(
          service.deployDatadogAPM(
            params[0] as any,
            params[1] as any,
            params[2] as any,
            params[3] as any,
            params[4] as any
          )
        ).rejects.toThrow('All deployment parameters are required');
      }
    });
  });

  describe('edge and negative cases', () => {
    it('should throw on invalid method calls', async () => {
      // @ts-expect-error: purposely calling with no args
      await expect(service.getAppServices()).rejects.toThrow();
      // @ts-expect-error: purposely calling with no args
      await expect(service.deployDatadogAPM()).rejects.toThrow();
    });

    it('should handle unexpected errors in makeRequest', async () => {
      // Simulate fetch throwing synchronously
      (global.fetch as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Sync error');
      });
      await expect(service.getSubscriptions()).rejects.toThrow('Sync error');
    });
  });
});
