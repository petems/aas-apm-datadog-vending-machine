import { AzureService, AzureApiError } from '../azureService';
import { mockSubscription, mockAppService, mockLinuxAppService } from '../../__tests__/helpers';

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
      await expect(service.getSubscriptions()).rejects.toThrow('Subscription not found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(service.getSubscriptions()).rejects.toThrow(AzureApiError);
      await expect(service.getSubscriptions()).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      jest.useFakeTimers();
      
      // Mock a request that never resolves
      mockFetch.mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const promise = service.getSubscriptions();
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(31000);
      
      await expect(promise).rejects.toThrow('Request timeout');
      
      jest.useRealTimers();
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
    });

    it('should extract resource group from app service ID', async () => {
      const mockData = { value: [mockAppService] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await service.getAppServices(subscriptionId);

      expect(result[0].resourceGroup).toBe('test-rg');
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

  describe('getARMTemplateUri', () => {
    it('should return Windows template URI', () => {
      const uri = service.getARMTemplateUri(true);
      expect(uri).toBe('https://test.github.io/arm/windows-appservice-datadog.json');
    });

    it('should return Linux template URI', () => {
      const uri = service.getARMTemplateUri(false);
      expect(uri).toBe('https://test.github.io/arm/linux-appservice-datadog.json');
    });
  });

  describe('deployDatadogAPM', () => {
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

    it('should validate required parameters', async () => {
      await expect(
        service.deployDatadogAPM('', 'rg', 'name', 'uri', deploymentParams.parameters)
      ).rejects.toThrow('All deployment parameters are required');
    });
  });
}); 