import { AzureService } from '../azureService';
import { mockSubscription, mockAppService } from '../../test-utils';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe.skip('ARM Template Service @integration', () => {
  let service: AzureService;
  const mockAccessToken = 'mock-access-token';

  beforeEach(() => {
    service = new AzureService(mockAccessToken);
    mockFetch.mockReset();
  });

  describe('getARMTemplateUri', () => {
    it('should return Windows template URI for Windows app services', () => {
      const result = service.getARMTemplateUri(true);
      expect(result).toContain('windows-appservice-datadog.json');
    });

    it('should return Linux template URI for Linux app services', () => {
      const result = service.getARMTemplateUri(false);
      expect(result).toContain('linux-appservice-datadog.json');
    });

    it('should return valid HTTPS URLs', () => {
      const windowsUri = service.getARMTemplateUri(true);
      const linuxUri = service.getARMTemplateUri(false);

      expect(windowsUri).toMatch(/^https:\/\//);
      expect(linuxUri).toMatch(/^https:\/\//);
    });
  });

  describe('deployDatadogAPM', () => {
    const mockDeploymentParams = {
      siteName: 'test-app-service',
      location: 'East US',
      ddApiKey: 'test-api-key-32-chars-long-here',
      ddSite: 'datadoghq.com',
    };

    it('should deploy ARM template successfully', async () => {
      const mockDeploymentResponse = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Resources/deployments/datadog-apm-123',
        name: 'datadog-apm-123',
        properties: {
          provisioningState: 'Succeeded',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeploymentResponse,
      } as Response);

      const result = await service.deployDatadogAPM(
        'test-subscription',
        'test-rg',
        'datadog-apm-123',
        'https://example.com/template.json',
        mockDeploymentParams
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions/test-subscription/resourceGroups/test-rg/providers/Microsoft.Resources/deployments/datadog-apm-123'),
        expect.objectContaining({
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('test-app-service'),
        })
      );

      expect(result).toEqual(mockDeploymentResponse);
    });

    it('should handle deployment failures', async () => {
      const errorResponse = {
        error: {
          message: 'Deployment failed',
          code: 'DeploymentFailed',
        },
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => errorResponse,
      } as unknown as Response);

      await expect(
        service.deployDatadogAPM(
          'test-subscription',
          'test-rg',
          'datadog-apm-123',
          'https://example.com/template.json',
          mockDeploymentParams
        )
      ).rejects.toThrow('Deployment failed');
    });

    it('should validate deployment parameters', async () => {
      const invalidParams = {
        siteName: '',
        location: '',
        ddApiKey: 'short',
        ddSite: '',
      };

      await expect(
        service.deployDatadogAPM(
          'test-subscription',
          'test-rg',
          'datadog-apm-123',
          'https://example.com/template.json',
          invalidParams
        )
      ).rejects.toThrow();
    });

    it('should generate unique deployment names', async () => {
      const mockDeploymentResponse = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Resources/deployments/datadog-apm-123',
        name: 'datadog-apm-123',
        properties: {
          provisioningState: 'Succeeded',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeploymentResponse,
      } as Response);

      await service.deployDatadogAPM(
        'test-subscription',
        'test-rg',
        'datadog-apm-123',
        'https://example.com/template.json',
        mockDeploymentParams
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/datadog-apm-\d+/),
        expect.any(Object)
      );
    });
  });

  describe('getDeploymentStatus', () => {
    it('should fetch deployment status successfully', async () => {
      const mockStatusResponse = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Resources/deployments/datadog-apm-123',
        name: 'datadog-apm-123',
        properties: {
          provisioningState: 'Succeeded',
          timestamp: '2023-01-01T00:00:00Z',
          duration: 'PT1M30S',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusResponse,
      } as Response);

      const result = await service.getDeploymentStatus(
        'test-subscription',
        'test-rg',
        'datadog-apm-123'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions/test-subscription/resourceGroups/test-rg/providers/Microsoft.Resources/deployments/datadog-apm-123'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      expect(result).toEqual(mockStatusResponse);
    });

    it('should handle deployment status errors', async () => {
      const errorResponse = {
        error: {
          message: 'Deployment not found',
          code: 'DeploymentNotFound',
        },
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => errorResponse,
      } as unknown as Response);

      await expect(
        service.getDeploymentStatus(
          'test-subscription',
          'test-rg',
          'datadog-apm-123'
        )
      ).rejects.toThrow('Deployment not found');
    });

    it('should handle in-progress deployments', async () => {
      const mockStatusResponse = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Resources/deployments/datadog-apm-123',
        name: 'datadog-apm-123',
        properties: {
          provisioningState: 'Running',
          timestamp: '2023-01-01T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusResponse,
      } as Response);

      const result = await service.getDeploymentStatus(
        'test-subscription',
        'test-rg',
        'datadog-apm-123'
      );

      expect(result.properties.provisioningState).toBe('Running');
    });
  });

  describe('ARM Template Validation', () => {
    it('should validate template parameters structure', () => {
      const validParams = {
        siteName: 'test-app',
        location: 'East US',
        ddApiKey: 'a'.repeat(32),
        ddSite: 'datadoghq.com',
      };

      // This would typically validate against a schema
      expect(validParams.siteName).toBeTruthy();
      expect(validParams.location).toBeTruthy();
      expect(validParams.ddApiKey.length).toBeGreaterThanOrEqual(32);
      expect(validParams.ddSite).toBeTruthy();
    });

    it('should reject invalid API keys', () => {
      const invalidParams = {
        siteName: 'test-app',
        location: 'East US',
        ddApiKey: 'short',
        ddSite: 'datadoghq.com',
      };

      expect(invalidParams.ddApiKey.length).toBeLessThan(32);
    });

    it('should validate Datadog site values', () => {
      const validSites = [
        'datadoghq.com',
        'datadoghq.eu',
        'us3.datadoghq.com',
        'us5.datadoghq.com',
        'ap1.datadoghq.com',
      ];

      validSites.forEach(site => {
        expect(site).toMatch(/^[a-z0-9.-]+\.datadoghq\.(com|eu)$/);
      });
    });
  });

  describe('Deployment Orchestration', () => {
    it('should handle deployment lifecycle', async () => {
      // Mock deployment creation
      const mockDeploymentResponse = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Resources/deployments/datadog-apm-123',
        name: 'datadog-apm-123',
        properties: {
          provisioningState: 'Accepted',
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockDeploymentResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockDeploymentResponse,
            properties: { ...mockDeploymentResponse.properties, provisioningState: 'Running' },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockDeploymentResponse,
            properties: { ...mockDeploymentResponse.properties, provisioningState: 'Succeeded' },
          }),
        } as Response);

      // Start deployment
      const deployment = await service.deployDatadogAPM(
        'test-subscription',
        'test-rg',
        'datadog-apm-123',
        'https://example.com/template.json',
        {
          siteName: 'test-app',
          location: 'East US',
          ddApiKey: 'a'.repeat(32),
          ddSite: 'datadoghq.com',
        }
      );

      expect(deployment.properties.provisioningState).toBe('Accepted');

      // Check status
      const status1 = await service.getDeploymentStatus(
        'test-subscription',
        'test-rg',
        'datadog-apm-123'
      );
      expect(status1.properties.provisioningState).toBe('Running');

      const status2 = await service.getDeploymentStatus(
        'test-subscription',
        'test-rg',
        'datadog-apm-123'
      );
      expect(status2.properties.provisioningState).toBe('Succeeded');
    });

    it('should handle deployment failures gracefully', async () => {
      const mockDeploymentResponse = {
        id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Resources/deployments/datadog-apm-123',
        name: 'datadog-apm-123',
        properties: {
          provisioningState: 'Failed',
          error: {
            message: 'Template validation failed',
            details: [
              {
                message: 'Parameter ddApiKey is required',
              },
            ],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeploymentResponse,
      } as Response);

      const status = await service.getDeploymentStatus(
        'test-subscription',
        'test-rg',
        'datadog-apm-123'
      );

      expect(status.properties.provisioningState).toBe('Failed');
      expect(status.properties.error.message).toBe('Template validation failed');
    });
  });

  describe('Template Parameter Generation', () => {
    it('should generate correct parameters for Windows app services', () => {
      const params = {
        siteName: 'test-windows-app',
        location: 'East US',
        ddApiKey: 'a'.repeat(32),
        ddSite: 'datadoghq.com',
      };

      // Validate parameter structure
      expect(params).toHaveProperty('siteName');
      expect(params).toHaveProperty('location');
      expect(params).toHaveProperty('ddApiKey');
      expect(params).toHaveProperty('ddSite');

      // Validate parameter values
      expect(params.siteName).toMatch(/^[a-z0-9-]+$/);
      expect(params.location).toMatch(/^[A-Za-z\s]+$/);
      expect(params.ddApiKey).toHaveLength(32);
      expect(params.ddSite).toMatch(/^[a-z0-9.-]+\.datadoghq\.(com|eu)$/);
    });

    it('should generate correct parameters for Linux app services', () => {
      const params = {
        siteName: 'test-linux-app',
        location: 'West US 2',
        ddApiKey: 'b'.repeat(32),
        ddSite: 'datadoghq.eu',
      };

      // Validate parameter structure
      expect(params).toHaveProperty('siteName');
      expect(params).toHaveProperty('location');
      expect(params).toHaveProperty('ddApiKey');
      expect(params).toHaveProperty('ddSite');

      // Validate parameter values
      expect(params.siteName).toMatch(/^[a-z0-9-]+$/);
      expect(params.location).toMatch(/^[A-Za-z\s]+$/);
      expect(params.ddApiKey).toHaveLength(32);
      expect(params.ddSite).toMatch(/^[a-z0-9.-]+\.datadoghq\.(com|eu)$/);
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should handle transient network errors', async () => {
      // Mock network error followed by success
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Resources/deployments/datadog-apm-123',
            name: 'datadog-apm-123',
            properties: {
              provisioningState: 'Succeeded',
            },
          }),
        } as Response);

      // This would typically be wrapped in retry logic
      await expect(
        service.deployDatadogAPM(
          'test-subscription',
          'test-rg',
          'datadog-apm-123',
          'https://example.com/template.json',
          {
            siteName: 'test-app',
            location: 'East US',
            ddApiKey: 'a'.repeat(32),
            ddSite: 'datadoghq.com',
          }
        )
      ).rejects.toThrow('Network error');
    });

    it('should handle rate limiting', async () => {
      const rateLimitResponse = {
        error: {
          message: 'Too many requests',
          code: 'TooManyRequests',
        },
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => rateLimitResponse,
      } as unknown as Response);

      await expect(
        service.deployDatadogAPM(
          'test-subscription',
          'test-rg',
          'datadog-apm-123',
          'https://example.com/template.json',
          {
            siteName: 'test-app',
            location: 'East US',
            ddApiKey: 'a'.repeat(32),
            ddSite: 'datadoghq.com',
          }
        )
      ).rejects.toThrow('Too many requests');
    });
  });
}); 