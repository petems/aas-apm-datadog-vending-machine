import {
  AzureSubscription,
  AzureAppService,
  DeploymentParameters,
} from '../types';

const AZURE_ARM_BASE_URL = 'https://management.azure.com';

export class AzureApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AzureApiError';
  }
}

export class AzureService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest<T>(
    url: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : null,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `Azure API error: ${response.status}`;
        let errorCode = `HTTP_${response.status}`;

        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
          errorCode = errorData.error?.code || errorCode;
        } catch {
          // If we can't parse error JSON, use the status text
          errorMessage = `${errorMessage} - ${response.statusText}`;
        }

        throw new AzureApiError(errorMessage, response.status, errorCode);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AzureApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AzureApiError('Request timeout', 408, 'TIMEOUT');
      }

      throw new AzureApiError(
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Fetch all subscriptions for the authenticated user
   */
  async getSubscriptions(): Promise<AzureSubscription[]> {
    const url = `${AZURE_ARM_BASE_URL}/subscriptions?api-version=2020-01-01`;
    const response = await this.makeRequest<{ value: AzureSubscription[] }>(
      url
    );

    // Return subscriptions
    return response.value;
  }

  /**
   * Fetch all App Services and Function Apps in a subscription
   */
  async getAppServices(subscriptionId: string): Promise<AzureAppService[]> {
    if (!subscriptionId) {
      throw new AzureApiError(
        'Subscription ID is required',
        400,
        'INVALID_INPUT'
      );
    }

    const url = `${AZURE_ARM_BASE_URL}/subscriptions/${subscriptionId}/providers/Microsoft.Web/sites?api-version=2022-09-01`;
    const response = await this.makeRequest<{ value: AzureAppService[] }>(url);

    // Filter and validate app services
    const filteredServices = response.value
      .filter(
        site =>
          site.kind?.includes('functionapp') ||
          site.kind?.includes('app') ||
          site.kind === 'app'
      )
      .map(service => {
        // Extract resource group from ID
        const resourceGroupMatch = service.id.match(/resourceGroups\/([^/]+)/);
        return {
          ...service,
          resourceGroup: resourceGroupMatch?.[1] || '',
        };
      });

    return filteredServices;
  }

  /**
   * Fetch all App Services and Function Apps in a specific resource group
   */
  async getAppServicesInResourceGroup(
    subscriptionId: string,
    resourceGroupName: string
  ): Promise<AzureAppService[]> {
    if (!subscriptionId || !resourceGroupName) {
      throw new AzureApiError(
        'Subscription ID and Resource Group Name are required',
        400,
        'INVALID_INPUT'
      );
    }

    const url = `${AZURE_ARM_BASE_URL}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Web/sites?api-version=2022-09-01`;
    const response = await this.makeRequest<{ value: AzureAppService[] }>(url);

    // Filter and validate app services
    const filteredServices = response.value
      .filter(
        site =>
          site.kind?.includes('functionapp') ||
          site.kind?.includes('app') ||
          site.kind === 'app'
      )
      .map(service => {
        // Extract resource group from ID
        const resourceGroupMatch = service.id.match(/resourceGroups\/([^/]+)/);
        return {
          ...service,
          resourceGroup: resourceGroupMatch?.[1] || '',
        };
      });

    return filteredServices;
  }

  /**
   * Get detailed information about a specific App Service
   */
  async getAppServiceDetails(
    subscriptionId: string,
    resourceGroupName: string,
    siteName: string
  ): Promise<AzureAppService> {
    if (!subscriptionId || !resourceGroupName || !siteName) {
      throw new AzureApiError(
        'All parameters are required',
        400,
        'INVALID_INPUT'
      );
    }

    const url = `${AZURE_ARM_BASE_URL}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Web/sites/${siteName}?api-version=2022-09-01`;
    return this.makeRequest<AzureAppService>(url);
  }

  /**
   * Determine if an App Service is running on Windows or Linux
   */
  isWindowsAppService(appService: AzureAppService): boolean {
    const kind = appService.kind?.toLowerCase() || '';

    // Check the kind property for Linux indicators
    if (kind.includes('linux')) {
      return false;
    }

    // Check if linuxFxVersion is set (indicates Linux)
    if (appService.properties.siteConfig?.linuxFxVersion) {
      return false;
    }

    // Default to Windows if no clear Linux indicators
    return true;
  }

  /**
   * Get ARM template URI based on platform
   */
  getARMTemplateUri(isWindows: boolean): string {
    const { origin, pathname } = window.location;
    const basePath = pathname.endsWith('/') ? pathname : `${pathname}/`;
    return `${origin}${basePath}arm/${
      isWindows ? 'windows' : 'linux'
    }-appservice-datadog.json`;
  }

  /**
   * Deploy ARM template to enable Datadog APM
   */
  async deployDatadogAPM(
    subscriptionId: string,
    resourceGroupName: string,
    deploymentName: string,
    templateUri: string,
    parameters: DeploymentParameters
  ): Promise<unknown> {
    if (
      !subscriptionId ||
      !resourceGroupName ||
      !deploymentName ||
      !templateUri ||
      !parameters ||
      typeof parameters.siteName === 'undefined' ||
      typeof parameters.location === 'undefined' ||
      typeof parameters.ddApiKey === 'undefined' ||
      typeof parameters.ddSite === 'undefined'
    ) {
      throw new AzureApiError(
        'All deployment parameters are required',
        400,
        'INVALID_INPUT'
      );
    }

    const url = `${AZURE_ARM_BASE_URL}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Resources/deployments/${deploymentName}?api-version=2021-04-01`;

    const deploymentPayload = {
      properties: {
        mode: 'Incremental',
        templateLink: {
          uri: templateUri,
        },
        parameters: {
          siteName: {
            value: parameters.siteName,
          },
          location: {
            value: parameters.location,
          },
          ddApiKey: {
            value: parameters.ddApiKey,
          },
          ddSite: {
            value: parameters.ddSite,
          },
        },
      },
    };

    return this.makeRequest(url, 'PUT', deploymentPayload);
  }

  /**
   * Check deployment status
   */
  async getDeploymentStatus(
    subscriptionId: string,
    resourceGroupName: string,
    deploymentName: string
  ): Promise<unknown> {
    if (!subscriptionId || !resourceGroupName || !deploymentName) {
      throw new AzureApiError(
        'All parameters are required',
        400,
        'INVALID_INPUT'
      );
    }

    const url = `${AZURE_ARM_BASE_URL}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Resources/deployments/${deploymentName}?api-version=2021-04-01`;
    return this.makeRequest(url);
  }

  /**
   * Fetch all resource groups in a subscription
   */
  async getResourceGroups(
    subscriptionId: string
  ): Promise<Array<{ id: string; name: string }>> {
    if (!subscriptionId) {
      throw new AzureApiError(
        'Subscription ID is required',
        400,
        'INVALID_INPUT'
      );
    }
    const url = `${AZURE_ARM_BASE_URL}/subscriptions/${subscriptionId}/resourcegroups?api-version=2021-04-01`;
    const response = await this.makeRequest<{
      value: Array<{ id: string; name: string }>;
    }>(url);
    return response.value;
  }
}
