import { AzureSubscription, AzureAppService, DeploymentParameters } from '../types';

const AZURE_ARM_BASE_URL = 'https://management.azure.com';

export class AzureService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest<T>(url: string, method: string = 'GET', body?: any): Promise<T> {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Azure API error: ${response.status} - ${errorData}`);
    }

    return response.json();
  }

  /**
   * Fetch all subscriptions for the authenticated user
   */
  async getSubscriptions(): Promise<AzureSubscription[]> {
    const url = `${AZURE_ARM_BASE_URL}/subscriptions?api-version=2020-01-01`;
    const response = await this.makeRequest<{ value: AzureSubscription[] }>(url);
    return response.value;
  }

  /**
   * Fetch all App Services (Function Apps) in a subscription
   */
  async getAppServices(subscriptionId: string): Promise<AzureAppService[]> {
    const url = `${AZURE_ARM_BASE_URL}/subscriptions/${subscriptionId}/providers/Microsoft.Web/sites?api-version=2022-09-01`;
    const response = await this.makeRequest<{ value: AzureAppService[] }>(url);
    
    // Filter for Function Apps and App Services only
    return response.value.filter(site => 
      site.kind?.includes('functionapp') || 
      site.kind?.includes('app') || 
      site.kind === 'app'
    );
  }

  /**
   * Get detailed information about a specific App Service
   */
  async getAppServiceDetails(subscriptionId: string, resourceGroupName: string, siteName: string): Promise<AzureAppService> {
    const url = `${AZURE_ARM_BASE_URL}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Web/sites/${siteName}?api-version=2022-09-01`;
    return this.makeRequest<AzureAppService>(url);
  }

  /**
   * Determine if an App Service is running on Windows or Linux
   */
  isWindowsAppService(appService: AzureAppService): boolean {
    // Check the kind property for Windows indicators
    if (appService.kind?.toLowerCase().includes('linux')) {
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
   * Deploy ARM template to enable Datadog APM
   */
  async deployDatadogAPM(
    subscriptionId: string,
    resourceGroupName: string,
    deploymentName: string,
    templateUri: string,
    parameters: DeploymentParameters
  ): Promise<any> {
    const url = `${AZURE_ARM_BASE_URL}/subscriptions/${subscriptionId}/resourcegroups/${resourceGroupName}/providers/Microsoft.Resources/deployments/${deploymentName}?api-version=2021-04-01`;
    
    const deploymentPayload = {
      properties: {
        mode: 'Incremental',
        templateLink: {
          uri: templateUri
        },
        parameters: {
          siteName: {
            value: parameters.siteName
          },
          location: {
            value: parameters.location
          },
          ddApiKey: {
            value: parameters.ddApiKey
          },
          ddSite: {
            value: parameters.ddSite
          }
        }
      }
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
  ): Promise<any> {
    const url = `${AZURE_ARM_BASE_URL}/subscriptions/${subscriptionId}/resourcegroups/${resourceGroupName}/providers/Microsoft.Resources/deployments/${deploymentName}?api-version=2021-04-01`;
    return this.makeRequest(url);
  }
}