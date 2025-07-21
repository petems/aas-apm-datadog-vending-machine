import {
  WebSiteManagementClient,
  Site,
  SiteConfigResource,
  StringDictionary,
  SiteContainer,
} from '@azure/arm-appservice';
import {
  ResourceManagementClient,
  ResourceGroup as AzureResourceGroup,
} from '@azure/arm-resources';
import {
  TokenCredential,
  InteractiveBrowserCredential,
  AccessToken,
} from '@azure/identity';
import {
  AzureSubscription,
  AzureAppService,
  DeploymentParameters,
} from '../types';

// Custom credential class to use existing token from MSAL
class ExistingTokenCredential implements TokenCredential {
  constructor(private accessToken: string) {}

  async getToken(): Promise<AccessToken> {
    // For now, return the token as-is
    // In a real implementation, you'd check expiry and refresh if needed
    return {
      token: this.accessToken,
      expiresOnTimestamp: Date.now() + 3600000, // 1 hour from now
    };
  }
}

// App settings and configuration types
type AppSettings = Record<string, string>;
type DatadogAppSettings = {
  DD_API_KEY: string;
  DD_SITE: string;
  DD_SERVICE: string;
  DD_ENV: string;
  DD_VERSION?: string;
  DD_SERVERLESS_LOG_PATH: string;
  WEBSITES_ENABLE_APP_SERVICE_STORAGE: string;
  // Sidecar connection settings (official Datadog approach)
  DD_TRACE_AGENT_URL?: string;
  DD_DOGSTATSD_URL?: string;
  DD_APM_ENABLED?: string;
  // .NET specific settings
  DD_DOTNET_TRACER_HOME?: string;
  DD_TRACE_LOG_DIRECTORY?: string;
  CORECLR_ENABLE_PROFILING?: string;
  CORECLR_PROFILER?: string;
  CORECLR_PROFILER_PATH?: string;
};

type AppServicePlan = {
  id: string;
  name: string;
  location: string;
  properties?: {
    provisioningState?: string;
    status?: string;
    hostingEnvironmentProfile?: {
      id?: string;
      name?: string;
      type?: string;
    };
    sku?: {
      name?: string;
      tier?: string;
      size?: string;
      family?: string;
      capacity?: number;
    };
  };
};

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
  private credential: TokenCredential;
  private webSiteClients: Map<string, WebSiteManagementClient> = new Map();
  private resourceClients: Map<string, ResourceManagementClient> = new Map();

  constructor(accessToken: string) {
    this.credential = new ExistingTokenCredential(accessToken);
  }

  private validateRequiredParams(
    params: Record<string, unknown>,
    message: string,
    allowEmptyStrings: boolean = false
  ): void {
    if (
      Object.values(params).some(
        v => v === undefined || v === null || (!allowEmptyStrings && v === '')
      )
    ) {
      throw new AzureApiError(message, 400, 'INVALID_INPUT');
    }
  }

  /**
   * Get or create a WebSiteManagementClient for a subscription
   */
  private getWebSiteClient(subscriptionId: string): WebSiteManagementClient {
    if (!this.webSiteClients.has(subscriptionId)) {
      const client = new WebSiteManagementClient(
        this.credential,
        subscriptionId
      );
      this.webSiteClients.set(subscriptionId, client);
    }
    return this.webSiteClients.get(subscriptionId)!;
  }

  /**
   * Get or create a ResourceManagementClient for a subscription
   */
  private getResourceClient(subscriptionId: string): ResourceManagementClient {
    if (!this.resourceClients.has(subscriptionId)) {
      const client = new ResourceManagementClient(
        this.credential,
        subscriptionId
      );
      this.resourceClients.set(subscriptionId, client);
    }
    return this.resourceClients.get(subscriptionId)!;
  }

  /**
   * Fetch all subscriptions for the authenticated user
   */
  async getSubscriptions(): Promise<AzureSubscription[]> {
    try {
      // For subscriptions, we'll continue using the REST API as the SDK method is complex
      const response = await fetch(
        'https://management.azure.com/subscriptions?api-version=2020-01-01',
        {
          headers: {
            Authorization: `Bearer ${await (this.credential as any).getToken().then((t: any) => t.token)}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.value || [];
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      throw new AzureApiError(
        'Failed to fetch subscriptions',
        500,
        'SUBSCRIPTIONS_FETCH_ERROR'
      );
    }
  }

  /**
   * Fetch all App Services and Function Apps in a subscription
   */
  async getAppServices(subscriptionId: string): Promise<AzureAppService[]> {
    this.validateRequiredParams(
      { subscriptionId },
      'Subscription ID is required'
    );

    try {
      const client = this.getWebSiteClient(subscriptionId);
      const sites = [];

      for await (const site of client.webApps.list()) {
        if (this.isValidAppService(site)) {
          sites.push(this.mapSiteToAppService(site));
        }
      }

      return sites;
    } catch (error) {
      console.error('Error fetching app services:', error);
      throw new AzureApiError(
        'Failed to fetch app services',
        500,
        'APP_SERVICES_FETCH_ERROR'
      );
    }
  }

  /**
   * Fetch all App Services and Function Apps in a specific resource group
   */
  async getAppServicesInResourceGroup(
    subscriptionId: string,
    resourceGroupName: string
  ): Promise<AzureAppService[]> {
    this.validateRequiredParams(
      { subscriptionId, resourceGroupName },
      'Both subscription ID and resource group name are required'
    );

    try {
      const client = this.getWebSiteClient(subscriptionId);
      const sites = [];

      for await (const site of client.webApps.listByResourceGroup(
        resourceGroupName
      )) {
        if (this.isValidAppService(site)) {
          sites.push(this.mapSiteToAppService(site));
        }
      }

      return sites;
    } catch (error) {
      console.error('Error fetching app services in resource group:', error);
      throw new AzureApiError(
        'Failed to fetch app services in resource group',
        500,
        'RESOURCE_GROUP_APP_SERVICES_FETCH_ERROR'
      );
    }
  }

  /**
   * Get details for a specific App Service
   */
  async getAppServiceDetails(
    subscriptionId: string,
    resourceGroupName: string,
    siteName: string
  ): Promise<AzureAppService> {
    this.validateRequiredParams(
      { subscriptionId, resourceGroupName, siteName },
      'All parameters are required'
    );

    try {
      const client = this.getWebSiteClient(subscriptionId);
      const site = await client.webApps.get(resourceGroupName, siteName);

      if (!site) {
        throw new AzureApiError(
          'App Service not found',
          404,
          'APP_SERVICE_NOT_FOUND'
        );
      }

      // Get site configuration separately to get runtime info
      let siteConfig;
      try {
        siteConfig = await client.webApps.getConfiguration(
          resourceGroupName,
          siteName
        );
        console.log('🔍 Site configuration retrieved:', siteConfig);
      } catch (configError) {
        console.warn('⚠️ Could not fetch site configuration:', configError);
      }

      // Add siteConfig to the site object if available
      const enrichedSite = siteConfig
        ? {
            ...site,
            siteConfig: siteConfig,
          }
        : site;

      return this.mapSiteToAppService(enrichedSite);
    } catch (error) {
      console.error('Error fetching app service details:', error);
      throw new AzureApiError(
        'Failed to fetch app service details',
        500,
        'APP_SERVICE_DETAILS_FETCH_ERROR'
      );
    }
  }

  /**
   * Determine the type of App Service (Windows, Linux, or Container)
   */
  getAppServiceType(
    appService: AzureAppService
  ): 'Windows' | 'Linux' | 'Container' {
    const kind = appService.kind?.toLowerCase() || '';
    const linuxFxVersion =
      appService.properties.siteConfig?.linuxFxVersion || '';

    // Check for Container App indicators
    if (kind.includes('container') || kind.includes('elastic')) {
      return 'Container';
    }

    // Check for explicit Linux indicators
    if (kind.includes('linux') || linuxFxVersion.length > 0) {
      return 'Linux';
    }

    // Check for Function App on Linux
    if (
      kind.includes('functionapp') &&
      (kind.includes('linux') || linuxFxVersion)
    ) {
      return 'Linux';
    }

    // Default to Windows for traditional App Services
    return 'Windows';
  }

  /**
   * Determine if an App Service is running on Windows or Linux (for backward compatibility)
   */
  isWindowsAppService(appService: AzureAppService): boolean {
    return this.getAppServiceType(appService) === 'Windows';
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
    this.validateRequiredParams(
      {
        subscriptionId,
        resourceGroupName,
        deploymentName,
        templateUri,
        parameters,
      },
      'All deployment parameters are required'
    );

    if (
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

    // This method is now handled by the ARM client, but we keep the interface
    // For now, we'll just return a placeholder or throw an error if not implemented
    // as the original logic was not fully refactored.
    // A proper implementation would involve deploying a template.
    console.warn('deployDatadogAPM is not fully implemented with the new SDK.');
    return Promise.resolve({ message: 'Deployment not fully implemented' });
  }

  /**
   * Check deployment status
   */
  async getDeploymentStatus(
    subscriptionId: string,
    resourceGroupName: string,
    deploymentName: string
  ): Promise<unknown> {
    this.validateRequiredParams(
      { subscriptionId, resourceGroupName, deploymentName },
      'All parameters are required'
    );

    // This method is now handled by the ARM client, but we keep the interface
    // For now, we'll just return a placeholder or throw an error if not implemented
    // as the original logic was not fully refactored.
    // A proper implementation would involve checking deployment status.
    console.warn(
      'getDeploymentStatus is not fully implemented with the new SDK.'
    );
    return Promise.resolve({
      message: 'Deployment status not fully implemented',
    });
  }

  /**
   * Fetch all resource groups in a subscription
   */
  async getResourceGroups(
    subscriptionId: string
  ): Promise<AzureResourceGroup[]> {
    this.validateRequiredParams(
      { subscriptionId },
      'Subscription ID is required'
    );

    try {
      const client = this.getResourceClient(subscriptionId);
      const resourceGroups = [];

      for await (const rg of client.resourceGroups.list()) {
        resourceGroups.push(rg);
      }

      return resourceGroups;
    } catch (error) {
      console.error('Error fetching resource groups:', error);
      throw new AzureApiError(
        'Failed to fetch resource groups',
        500,
        'RESOURCE_GROUPS_FETCH_ERROR'
      );
    }
  }

  /**
   * Get App Service Plan details
   */
  async getAppServicePlan(
    subscriptionId: string,
    resourceGroupName: string,
    planName: string
  ): Promise<AppServicePlan> {
    this.validateRequiredParams(
      { subscriptionId, resourceGroupName, planName },
      'All parameters are required'
    );

    try {
      const client = this.getWebSiteClient(subscriptionId);
      const plan = await client.appServicePlans.get(
        resourceGroupName,
        planName
      );

      const properties: any = {
        provisioningState: plan.provisioningState,
        status: plan.status,
      };

      if (plan.hostingEnvironmentProfile) {
        properties.hostingEnvironmentProfile = {
          ...(plan.hostingEnvironmentProfile.id && {
            id: plan.hostingEnvironmentProfile.id,
          }),
          ...(plan.hostingEnvironmentProfile.name && {
            name: plan.hostingEnvironmentProfile.name,
          }),
          ...(plan.hostingEnvironmentProfile.type && {
            type: plan.hostingEnvironmentProfile.type,
          }),
        };
      }

      if (plan.sku) {
        properties.sku = {
          ...(plan.sku.name && { name: plan.sku.name }),
          ...(plan.sku.tier && { tier: plan.sku.tier }),
          ...(plan.sku.size && { size: plan.sku.size }),
          ...(plan.sku.family && { family: plan.sku.family }),
          ...(plan.sku.capacity && { capacity: plan.sku.capacity }),
        };
      }

      return {
        id: plan.id || '',
        name: plan.name || '',
        location: plan.location || '',
        properties,
      };
    } catch (error) {
      console.error('Error fetching app service plan:', error);
      throw new AzureApiError(
        'Failed to fetch app service plan',
        500,
        'APP_SERVICE_PLAN_FETCH_ERROR'
      );
    }
  }

  /**
   * Get app settings for a specific App Service
   */
  async getAppSettings(
    subscriptionId: string,
    resourceGroupName: string,
    siteName: string
  ): Promise<AppSettings> {
    this.validateRequiredParams(
      { subscriptionId, resourceGroupName, siteName },
      'All parameters are required'
    );

    try {
      const client = this.getWebSiteClient(subscriptionId);
      const appSettings = await client.webApps.listApplicationSettings(
        resourceGroupName,
        siteName
      );

      return appSettings.properties || {};
    } catch (error) {
      console.error('Error fetching app settings:', error);
      throw new AzureApiError(
        'Failed to fetch app settings',
        500,
        'APP_SETTINGS_FETCH_ERROR'
      );
    }
  }

  /**
   * Update app settings for a specific App Service
   */
  async updateAppSettings(
    subscriptionId: string,
    resourceGroupName: string,
    siteName: string,
    settings: AppSettings
  ): Promise<void> {
    this.validateRequiredParams(
      { subscriptionId, resourceGroupName, siteName },
      'All parameters are required'
    );

    try {
      const client = this.getWebSiteClient(subscriptionId);
      const appSettings: StringDictionary = {
        properties: settings,
      };

      await client.webApps.updateApplicationSettings(
        resourceGroupName,
        siteName,
        appSettings
      );
    } catch (error) {
      console.error('Error updating app settings:', error);
      throw new AzureApiError(
        'Failed to update app settings',
        500,
        'APP_SETTINGS_UPDATE_ERROR'
      );
    }
  }

  /**
   * Configure Datadog application settings
   */
  async configureDatadogAppSettings(
    subscriptionId: string,
    resourceGroupName: string,
    siteName: string,
    config: {
      apiKey: string;
      site: string;
      service: string;
      environment: string;
      version?: string;
      logPath: string;
      isDotNet: boolean;
    }
  ): Promise<void> {
    // Get current app settings to preserve existing ones
    const currentSettings = await this.getAppSettings(
      subscriptionId,
      resourceGroupName,
      siteName
    );

    // Build Datadog settings
    const datadogSettings: DatadogAppSettings = {
      DD_API_KEY: config.apiKey,
      DD_SITE: config.site,
      DD_SERVICE: config.service,
      DD_ENV: config.environment,
      DD_SERVERLESS_LOG_PATH: config.logPath,
      WEBSITES_ENABLE_APP_SERVICE_STORAGE: 'true',
      // Connect to sidecar for tracing and metrics (official Datadog approach)
      DD_TRACE_AGENT_URL: 'http://datadog-sidecar:8126',
      DD_DOGSTATSD_URL: 'udp://datadog-sidecar:8125',
      DD_APM_ENABLED: 'true',
    };

    // Add version if provided
    if (config.version) {
      datadogSettings.DD_VERSION = config.version;
    }

    // Add .NET specific settings if needed
    if (config.isDotNet) {
      datadogSettings.DD_DOTNET_TRACER_HOME = '/home/site/wwwroot/datadog';
      datadogSettings.DD_TRACE_LOG_DIRECTORY = '/home/LogFiles/dotnet';
      datadogSettings.CORECLR_ENABLE_PROFILING = '1';
      datadogSettings.CORECLR_PROFILER =
        '{846F5F1C-F9AE-4B07-969E-05C26BC060D8}';
      datadogSettings.CORECLR_PROFILER_PATH =
        '/home/site/wwwroot/datadog/linux-x64/Datadog.Trace.ClrProfiler.Native.so';
    }

    // Merge with existing settings
    const updatedSettings = {
      ...currentSettings,
      ...datadogSettings,
    };

    await this.updateAppSettings(
      subscriptionId,
      resourceGroupName,
      siteName,
      updatedSettings
    );
  }

  /**
   * Configure sidecar container for Datadog (Linux App Services only)
   */
  async configureSidecarContainer(
    subscriptionId: string,
    resourceGroupName: string,
    siteName: string,
    config: {
      apiKey: string;
      site: string;
      sidecarImage?: string;
      sidecarPort?: string;
      sidecarRegistryUrl?: string;
      sidecarStartupCommand?: string;
      allowAccessToAllAppSettings?: boolean;
    }
  ): Promise<void> {
    this.validateRequiredParams(
      { subscriptionId, resourceGroupName, siteName },
      'All parameters are required'
    );

    try {
      const client = this.getWebSiteClient(subscriptionId);
      const SIDECAR_CONTAINER_NAME = 'datadog-sidecar';

      // Build the full image name with registry if provided
      const registryUrl = config.sidecarRegistryUrl || 'index.docker.io';
      const imageName = config.sidecarImage || 'datadog/serverless-init:latest';
      // Always construct the full image URL: registryUrl/imageName
      const SIDECAR_IMAGE = `${registryUrl}/${imageName}`;
      const SIDECAR_PORT = config.sidecarPort || '8126';

      // Get all existing app settings to pass to the sidecar
      const existingAppSettings = await this.getAppSettings(
        subscriptionId,
        resourceGroupName,
        siteName
      );

      // Get environment variables for the sidecar
      const envVars = {
        DD_API_KEY: config.apiKey,
        DD_SITE: config.site,
        DD_APM_ENABLED: 'true',
        DD_DOGSTATSD_NON_LOCAL_TRAFFIC: 'true',
        // Copy all existing app settings as environment variables
        ...existingAppSettings,
      };

      console.log('🔧 Sidecar configuration received:', {
        registryUrl,
        imageName,
        finalImage: SIDECAR_IMAGE,
        port: SIDECAR_PORT,
        fullImageUrl: `${registryUrl}/${imageName}`,
        existingAppSettingsCount: Object.keys(existingAppSettings).length,
        totalEnvVarsCount: Object.keys(envVars).length,
      });

      console.log('📋 Environment variables being passed to sidecar:', {
        datadogVars: Object.keys(envVars).filter(key => key.startsWith('DD_')),
        appSettingsVars: Object.keys(envVars).filter(
          key => !key.startsWith('DD_')
        ),
        totalVars: Object.keys(envVars),
      });

      // Check if sidecar container already exists with correct configuration
      const siteContainers = await this.getSiteContainers(
        subscriptionId,
        resourceGroupName,
        siteName
      );
      const sidecarContainer = siteContainers.find(
        c => c.name === SIDECAR_CONTAINER_NAME
      );

      // Check if sidecar needs to be created or updated
      const needsUpdate =
        sidecarContainer === undefined ||
        sidecarContainer.image !== SIDECAR_IMAGE ||
        sidecarContainer.targetPort !== SIDECAR_PORT ||
        !this.arraysEqual(
          sidecarContainer.environmentVariables?.map(({ name }) => name) || [],
          Object.keys(envVars)
        ) ||
        !this.arraysEqual(
          sidecarContainer.environmentVariables?.map(({ value }) => value) ||
            [],
          Object.values(envVars)
        );

      if (needsUpdate) {
        console.log(
          `${sidecarContainer === undefined ? 'Creating' : 'Updating'} sidecar container ${SIDECAR_CONTAINER_NAME} on ${siteName}`
        );

        const sidecarContainerConfig: SiteContainer = {
          image: SIDECAR_IMAGE,
          targetPort: SIDECAR_PORT,
          isMain: false,
          // Pass all environment variables with their actual values
          environmentVariables: Object.entries(envVars).map(
            ([name, value]) => ({ name, value })
          ),
        };

        // Add startup command if provided
        if (config.sidecarStartupCommand) {
          (sidecarContainerConfig as any).command = [
            config.sidecarStartupCommand,
          ];
        }

        await client.webApps.createOrUpdateSiteContainer(
          resourceGroupName,
          siteName,
          SIDECAR_CONTAINER_NAME,
          sidecarContainerConfig
        );
      } else {
        console.log(
          `Sidecar container ${SIDECAR_CONTAINER_NAME} already exists with correct configuration.`
        );
      }

      // Update application settings with environment variables
      const existingEnvVars = await client.webApps.listApplicationSettings(
        resourceGroupName,
        siteName
      );
      const updatedEnvVars = {
        properties: { ...existingEnvVars.properties, ...envVars },
      };

      if (
        !this.objectsEqual(
          existingEnvVars.properties,
          updatedEnvVars.properties
        )
      ) {
        console.log(`Updating Application Settings for ${siteName}`);
        await client.webApps.updateApplicationSettings(
          resourceGroupName,
          siteName,
          updatedEnvVars
        );
      } else {
        console.log(`No Application Settings changes needed for ${siteName}.`);
      }
    } catch (error) {
      console.error('Error configuring sidecar container:', error);
      throw new AzureApiError(
        'Failed to configure sidecar container',
        500,
        'SIDECAR_CONFIG_ERROR'
      );
    }
  }

  private arraysEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    const setB = new Set(b);
    return (
      setA.size === setB.size &&
      Array.from(setA).every(value => setB.has(value))
    );
  }

  private objectsEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /**
   * Restart an App Service
   */
  async restartAppService(
    subscriptionId: string,
    resourceGroupName: string,
    siteName: string
  ): Promise<void> {
    this.validateRequiredParams(
      { subscriptionId, resourceGroupName, siteName },
      'All parameters are required'
    );

    try {
      const client = this.getWebSiteClient(subscriptionId);
      await client.webApps.restart(resourceGroupName, siteName);
    } catch (error) {
      console.error('Error restarting app service:', error);
      throw new AzureApiError(
        'Failed to restart app service',
        500,
        'APP_SERVICE_RESTART_ERROR'
      );
    }
  }

  /**
   * Complete Datadog configuration workflow
   */
  async configureDatadog(
    subscriptionId: string,
    resourceGroupName: string,
    siteName: string,
    config: {
      apiKey: string;
      site: string;
      service: string;
      environment: string;
      version?: string;
      logPath: string;
      isDotNet: boolean;
      includeSidecar: boolean;
      sidecarImage?: string;
      sidecarPort?: string;
    },
    onProgress?: (step: string) => void
  ): Promise<void> {
    try {
      // Step 1: Configure application settings
      onProgress?.('Configuring application settings...');
      await this.configureDatadogAppSettings(
        subscriptionId,
        resourceGroupName,
        siteName,
        config
      );

      // Step 2: Configure sidecar container (if requested and Linux)
      if (config.includeSidecar) {
        onProgress?.('Configuring sidecar container...');
        await this.configureSidecarContainer(
          subscriptionId,
          resourceGroupName,
          siteName,
          config
        );
      }

      // Step 3: Restart application
      onProgress?.('Restarting application...');
      await this.restartAppService(subscriptionId, resourceGroupName, siteName);

      onProgress?.('Configuration completed successfully!');
    } catch (error) {
      onProgress?.(
        `Configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  /**
   * Get sidecar container configuration for Linux App Services
   */
  async getSidecarConfiguration(
    subscriptionId: string,
    resourceGroupName: string,
    siteName: string
  ): Promise<any> {
    this.validateRequiredParams(
      { subscriptionId, resourceGroupName, siteName },
      'All parameters are required'
    );

    try {
      const client = this.getWebSiteClient(subscriptionId);
      const siteConfig = await client.webApps.getConfiguration(
        resourceGroupName,
        siteName
      );
      return siteConfig;
    } catch (error) {
      console.error('Error getting sidecar configuration:', error);
      return null;
    }
  }

  /**
   * Get installed extensions for Windows App Services
   */
  async getInstalledExtensions(
    subscriptionId: string,
    resourceGroupName: string,
    siteName: string
  ): Promise<any[]> {
    if (!subscriptionId || !resourceGroupName || !siteName) {
      throw new AzureApiError(
        'All parameters are required',
        400,
        'INVALID_INPUT'
      );
    }

    try {
      const client = this.getWebSiteClient(subscriptionId);
      const extensions = [];

      for await (const ext of client.webApps.listSiteExtensions(
        resourceGroupName,
        siteName
      )) {
        extensions.push(ext);
      }

      return extensions;
    } catch (error) {
      console.warn('Could not fetch extensions:', error);
      return [];
    }
  }

  /**
   * Get sitecontainers for Linux App Services to detect sidecar containers
   */
  async getSiteContainers(
    subscriptionId: string,
    resourceGroupName: string,
    siteName: string,
    slotName?: string
  ): Promise<SiteContainer[]> {
    if (!subscriptionId || !resourceGroupName || !siteName) {
      throw new AzureApiError(
        'All parameters are required',
        400,
        'INVALID_INPUT'
      );
    }

    try {
      const client = this.getWebSiteClient(subscriptionId);
      const containers = [];

      // Use the appropriate method based on whether it's a slot or not
      const containerIterator = slotName
        ? client.webApps.listSiteContainersSlot(
            resourceGroupName,
            siteName,
            slotName
          )
        : client.webApps.listSiteContainers(resourceGroupName, siteName);

      for await (const container of containerIterator) {
        containers.push(container);
      }

      return containers;
    } catch (error) {
      console.warn('Could not fetch sitecontainers:', error);
      return [];
    }
  }

  /**
   * Get detailed information about a specific sitecontainer
   */
  async getSiteContainerDetails(
    subscriptionId: string,
    resourceGroupName: string,
    siteName: string,
    containerName: string,
    slotName?: string
  ): Promise<any> {
    if (!subscriptionId || !resourceGroupName || !siteName || !containerName) {
      throw new AzureApiError(
        'All parameters are required',
        400,
        'INVALID_INPUT'
      );
    }

    try {
      const client = this.getWebSiteClient(subscriptionId);
      const container = slotName
        ? await client.webApps.getSiteContainerSlot(
            resourceGroupName,
            siteName,
            slotName,
            containerName
          )
        : await client.webApps.getSiteContainer(
            resourceGroupName,
            siteName,
            containerName
          );

      return container;
    } catch (error) {
      console.warn('Could not fetch sitecontainer details:', error);
      return null;
    }
  }

  /**
   * Get the status of a specific sitecontainer
   */
  async getSiteContainerStatus(
    subscriptionId: string,
    resourceGroupName: string,
    siteName: string,
    containerName: string,
    slotName?: string
  ): Promise<any> {
    if (!subscriptionId || !resourceGroupName || !siteName || !containerName) {
      throw new AzureApiError(
        'All parameters are required',
        400,
        'INVALID_INPUT'
      );
    }

    try {
      const client = this.getWebSiteClient(subscriptionId);

      // Try to get container status
      const status = slotName
        ? await client.webApps.getSiteContainerSlot(
            resourceGroupName,
            siteName,
            slotName,
            containerName
          )
        : await client.webApps.getSiteContainer(
            resourceGroupName,
            siteName,
            containerName
          );

      return status;
    } catch (error) {
      console.warn('Could not fetch sitecontainer status:', error);
      return null;
    }
  }

  /**
   * Analyze Datadog configuration for the app service
   */
  analyzeDatadogConfiguration(
    appService: AzureAppService,
    sidecarConfig?: any,
    extensions?: any[],
    siteContainers?: any[]
  ): {
    hasDatadogSetup: boolean;
    setupType: 'sidecar' | 'extension' | 'settings-only' | 'none';
    details: any;
  } {
    const serviceType = this.getAppServiceType(appService);

    if (serviceType === 'Linux') {
      // First check for sidecar containers using the sitecontainers API
      const datadogSidecar = siteContainers?.find(container => {
        const hasDatadogInImage = container.properties?.image
          ?.toLowerCase()
          .includes('datadog');
        const hasDatadogInName = container.name
          ?.toLowerCase()
          .includes('datadog');

        return hasDatadogInImage || hasDatadogInName;
      });

      if (datadogSidecar) {
        // Extract data based on actual API structure
        const containerImage = datadogSidecar.properties?.image || 'Unknown';
        const containerPort =
          datadogSidecar.properties?.targetPort || 'Not configured';
        const containerName = datadogSidecar.name || 'Unknown';

        // Basic metadata - actual status will be fetched separately via getSiteContainerStatus
        const createdTime = datadogSidecar.properties?.createdTime;
        const lastModifiedTime = datadogSidecar.properties?.lastModifiedTime;
        const containerStatus = 'Checking...'; // Will be updated with real status

        return {
          hasDatadogSetup: true,
          setupType: 'sidecar',
          details: {
            containerName,
            containerImage,
            port: containerPort,
            status: containerStatus,
            createdTime,
            lastModifiedTime,
          },
        };
      }

      // Fallback: Check for Datadog sidecar container in linuxFxVersion
      const containers =
        sidecarConfig?.properties?.siteConfig?.linuxFxVersion || '';
      const hasDatadogSidecar = containers
        .toLowerCase()
        .includes('datadog/serverless-init');

      if (hasDatadogSidecar) {
        return {
          hasDatadogSetup: true,
          setupType: 'sidecar',
          details: {
            containerImage: containers,
            port:
              sidecarConfig?.properties?.siteConfig?.appSettings?.find(
                (setting: any) => setting.name === 'WEBSITES_PORT'
              )?.value || 'Not configured',
          },
        };
      }
    } else if (serviceType === 'Windows') {
      // Check for Datadog extension
      const datadogExtension = extensions?.find(
        ext =>
          ext.id?.toLowerCase().includes('datadog') ||
          ext.title?.toLowerCase().includes('datadog')
      );

      if (datadogExtension) {
        return {
          hasDatadogSetup: true,
          setupType: 'extension',
          details: {
            extensionId: datadogExtension.id,
            title: datadogExtension.title,
            version: datadogExtension.version,
            state:
              datadogExtension.provisioningState ||
              datadogExtension.installationState,
          },
        };
      }
    }

    // No sidecar or extension found, check if there are Datadog settings
    return {
      hasDatadogSetup: false,
      setupType: 'none',
      details: null,
    };
  }

  /**
   * Parse the language and runtime information from an App Service
   */
  getAppServiceLanguage(appService: AzureAppService): {
    language: string;
    version: string;
    rawRuntime: string;
  } | null {
    const serviceType = this.getAppServiceType(appService);
    const siteConfig = appService.properties.siteConfig;

    let runtimeString = '';

    // Get the appropriate runtime string based on app service type
    if (serviceType === 'Linux' && siteConfig?.linuxFxVersion) {
      runtimeString = siteConfig.linuxFxVersion;
    } else if (serviceType === 'Windows' && siteConfig?.windowsFxVersion) {
      runtimeString = siteConfig.windowsFxVersion;
    }

    // If no runtime string found, return null
    if (!runtimeString || runtimeString.trim() === '') {
      return null;
    }

    // Parse the runtime string to extract language and version
    const parsed = this.parseRuntimeString(runtimeString, serviceType);
    if (!parsed) {
      return null;
    }

    return {
      language: parsed.language,
      version: parsed.version,
      rawRuntime: runtimeString,
    };
  }

  /**
   * Parse a runtime string to extract language and version
   */
  private parseRuntimeString(
    runtimeString: string,
    serviceType: 'Windows' | 'Linux' | 'Container'
  ): {
    language: string;
    version: string;
  } | null {
    if (!runtimeString) return null;

    const runtime = runtimeString.toUpperCase();

    // Helper function to split on either : or |
    const splitRuntime = (pattern: string): string => {
      if (runtime.includes(`${pattern}:`)) {
        return runtime.split(`${pattern}:`)[1] || '';
      } else if (runtime.includes(`${pattern}|`)) {
        return runtime.split(`${pattern}|`)[1] || '';
      }
      return '';
    };

    // .NET Core patterns (Linux: "DOTNETCORE:9.0" or "DOTNETCORE|9.0", Windows: "dotnet:9" or "dotnet|9")
    if (runtime.includes('DOTNETCORE')) {
      const version = splitRuntime('DOTNETCORE');
      if (version) return { language: '.NET Core', version };
    }
    if (runtime.includes('DOTNET')) {
      const version = splitRuntime('DOTNET');
      if (version) return { language: '.NET', version };
    }

    // ASP.NET patterns (Windows: "ASPNET:V4.8" or "ASPNET|V4.8")
    if (runtime.includes('ASPNET')) {
      const version = splitRuntime('ASPNET');
      if (version) return { language: 'ASP.NET', version };
    }

    // Node.js patterns (Linux: "NODE:22-lts" or "NODE|22-lts", Windows: "NODE:22LTS" or "NODE|22LTS")
    if (runtime.includes('NODE')) {
      const version = splitRuntime('NODE');
      if (version) return { language: 'Node.js', version };
    }

    // Python patterns (Linux: "PYTHON:3.13" or "PYTHON|3.13")
    if (runtime.includes('PYTHON')) {
      const version = splitRuntime('PYTHON');
      if (version) return { language: 'Python', version };
    }

    // PHP patterns (Linux: "PHP:8.4" or "PHP|8.4")
    if (runtime.includes('PHP')) {
      const version = splitRuntime('PHP');
      if (version) return { language: 'PHP', version };
    }

    // Java patterns (Linux: "JAVA:21-java21" or "JAVA|21-java21", Windows: "JAVA:21" or "JAVA|21")
    if (runtime.includes('JAVA')) {
      const version = splitRuntime('JAVA');
      if (version) return { language: 'Java', version };
    }

    // Tomcat patterns (both: "TOMCAT:11.0-java21" or "TOMCAT|11.0-java21")
    if (runtime.includes('TOMCAT')) {
      const version = splitRuntime('TOMCAT');
      if (version) return { language: 'Tomcat', version };
    }

    // JBoss EAP patterns (Linux: "JBOSSEAP:8-java21" or "JBOSSEAP|8-java21")
    if (runtime.includes('JBOSSEAP')) {
      const version = splitRuntime('JBOSSEAP');
      if (version) return { language: 'JBoss EAP', version };
    }

    // If no known pattern matches, return the original string
    return { language: 'Unknown', version: runtimeString };
  }

  /**
   * Helper method to check if a site is a valid App Service or Function App
   */
  private isValidAppService(site: Site): boolean {
    return !!(
      site.name &&
      site.resourceGroup &&
      site.location &&
      site.kind !== 'api' &&
      site.kind !== 'workflowapp'
    );
  }

  /**
   * Helper method to map Azure SDK Site to our AzureAppService type
   */
  private mapSiteToAppService(site: Site) {
    const resourceId = site.id || '';
    return {
      id: resourceId,
      name: site.name || '',
      type: site.type || '',
      kind: site.kind || '',
      location: site.location || '',
      resourceGroup: site.resourceGroup || '',
      subscriptionId: this.extractSubscriptionFromId(resourceId),
      properties: {
        state: site.state || 'Unknown',
        hostNames: site.hostNames || [],
        repositorySiteName: '', // Not available in SDK Site type
        usageState: site.usageState || 'Unknown',
        enabled: site.enabled || false,
        enabledHostNames: site.enabledHostNames || [],
        availabilityState: site.availabilityState || 'Unknown',
        serverFarmId: site.serverFarmId || '',
        reserved: site.reserved || false,
        isXenon: site.isXenon || false,
        hyperV: site.hyperV || false,
        lastModifiedTimeUtc: site.lastModifiedTimeUtc?.toISOString() || '',
        storageRecoveryDefaultState: '', // Not available in SDK Site type
        contentAvailabilityState: 'Unknown', // Not available in SDK Site type
        runtimeAvailabilityState: 'Unknown', // Not available in SDK Site type
        httpsOnly: site.httpsOnly || false,
        redundancyMode: site.redundancyMode || 'None',
        publicNetworkAccess: site.publicNetworkAccess || 'Enabled',
        siteConfig: (site as any).siteConfig || undefined,
      },
    };
  }

  /**
   * Helper method to extract subscription ID from Azure resource ID
   */
  private extractSubscriptionFromId(resourceId: string): string {
    const match = resourceId.match(/\/subscriptions\/([^/]+)/);
    return match ? match[1]! : '';
  }
}
