import { z } from 'zod';

// Zod schemas for runtime validation
export const AzureSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
  displayName: z.string().min(1),
  state: z.string(),
  tenantId: z.string().min(1),
});

export const AzureAppServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().optional(),
  kind: z.string().optional(),
  location: z.string().min(1),
  resourceGroup: z.string().min(1),
  subscriptionId: z.string().optional(),
  properties: z.object({
    state: z.string(),
    hostNames: z.array(z.string()),
    repositorySiteName: z.string().optional(),
    usageState: z.string().optional(),
    enabled: z.boolean().optional(),
    enabledHostNames: z.array(z.string()).optional(),
    availabilityState: z.string().optional(),
    serverFarmId: z.string().optional(),
    reserved: z.boolean().optional(),
    isXenon: z.boolean().optional(),
    hyperV: z.boolean().optional(),
    lastModifiedTimeUtc: z.string().optional(),
    storageRecoveryDefaultState: z.string().optional(),
    contentAvailabilityState: z.string().optional(),
    runtimeAvailabilityState: z.string().optional(),
    httpsOnly: z.boolean().optional(),
    redundancyMode: z.string().optional(),
    publicNetworkAccess: z.string().optional(),
    siteConfig: z
      .object({
        linuxFxVersion: z.string().optional(),
        windowsFxVersion: z.string().optional(),
      })
      .optional(),
  }),
});

export const DatadogSiteSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

export const DeploymentParametersSchema = z.object({
  siteName: z.string().min(1),
  location: z.string().min(1),
  ddApiKey: z.string().min(1),
  ddSite: z.string().min(1),
});

export const DatadogFormSchema = z.object({
  subscription: z.string().min(1, 'Please select a subscription'),
  appService: z.string().min(1, 'Please select an app service'),
  datadogSite: z.string().min(1, 'Please select a Datadog site'),
  apiKey: z
    .string()
    .min(32, 'API key must be at least 32 characters')
    .regex(/^[a-f0-9]+$/, 'API key must be hexadecimal'),
});

// New schemas for direct Datadog configuration
export const DatadogConfigFormSchema = z.object({
  subscription: z.string().min(1, 'Please select a subscription'),
  resourceGroup: z.string().min(1, 'Please select a resource group'),
  appService: z.string().min(1, 'Please select an app service'),
  datadogSite: z.string().min(1, 'Please select a Datadog site'),
  apiKey: z
    .string()
    .min(32, 'API key must be at least 32 characters')
    .regex(/^[a-f0-9]+$/, 'API key must be hexadecimal'),
  serviceName: z.string().min(1, 'Service name is required'),
  environment: z.string().min(1, 'Environment is required'),
  version: z.string().optional(),
  logPath: z.string().min(1, 'Log path is required'),
  isDotNet: z.boolean().default(false),
});

export const AppSettingsSchema = z.record(z.string());

export const DatadogAppSettingsSchema = z.object({
  DD_API_KEY: z.string(),
  DD_SITE: z.string(),
  DD_SERVICE: z.string(),
  DD_ENV: z.string(),
  DD_VERSION: z.string().optional(),
  DD_SERVERLESS_LOG_PATH: z.string(),
  WEBSITES_ENABLE_APP_SERVICE_STORAGE: z.string(),
  // .NET specific settings
  DD_DOTNET_TRACER_HOME: z.string().optional(),
  DD_TRACE_LOG_DIRECTORY: z.string().optional(),
  CORECLR_ENABLE_PROFILING: z.string().optional(),
  CORECLR_PROFILER: z.string().optional(),
  CORECLR_PROFILER_PATH: z.string().optional(),
});

export const ContainerConfigSchema = z.object({
  linuxFxVersion: z.string(),
});

export const ResourceGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const AppServicePlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  location: z.string().min(1),
  properties: z
    .object({
      provisioningState: z.string().optional(),
      status: z.string().optional(),
      hostingEnvironmentProfile: z
        .object({
          id: z.string().optional(),
          name: z.string().optional(),
          type: z.string().optional(),
        })
        .optional(),
      sku: z
        .object({
          name: z.string().optional(),
          tier: z.string().optional(),
          size: z.string().optional(),
          family: z.string().optional(),
          capacity: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

// TypeScript types derived from Zod schemas
export type AzureSubscription = z.infer<typeof AzureSubscriptionSchema>;
export type AzureAppService = z.infer<typeof AzureAppServiceSchema>;
export type DatadogSite = z.infer<typeof DatadogSiteSchema>;
export type DeploymentParameters = z.infer<typeof DeploymentParametersSchema>;
export type DatadogFormData = z.infer<typeof DatadogFormSchema>;
export type DatadogConfigFormData = z.infer<typeof DatadogConfigFormSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type DatadogAppSettings = z.infer<typeof DatadogAppSettingsSchema>;
export type ContainerConfig = z.infer<typeof ContainerConfigSchema>;
export type AppServicePlan = z.infer<typeof AppServicePlanSchema>;

// Additional types
export type DeploymentStatus = 'idle' | 'deploying' | 'success' | 'error';
export type ConfigurationStatus = 'idle' | 'configuring' | 'success' | 'error';

export type LoadingState = {
  subscriptions: boolean;
  appServices: boolean;
  deployment: boolean;
  resourceGroups: boolean;
  configuration: boolean;
};

export type ApiError = {
  message: string;
  status?: number;
  code?: string;
};

export type AppState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  error: ApiError | null;
  deploymentStatus: DeploymentStatus;
  configurationStatus: ConfigurationStatus;
  loadingState: LoadingState;
};

export type ResourceGroup = z.infer<typeof ResourceGroupSchema>;

export type ConfigurationStep = {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
};

// Constants
export const DATADOG_SITES: DatadogSite[] = [
  { value: 'datadoghq.com', label: 'US1 (datadoghq.com)' },
  { value: 'datadoghq.eu', label: 'EU1 (datadoghq.eu)' },
  { value: 'us3.datadoghq.com', label: 'US3 (us3.datadoghq.com)' },
  { value: 'us5.datadoghq.com', label: 'US5 (us5.datadoghq.com)' },
  { value: 'ap1.datadoghq.com', label: 'AP1 (ap1.datadoghq.com)' },
];

export const AZURE_ARM_BASE_URL = 'https://management.azure.com';

// Query keys for React Query
export const QUERY_KEYS = {
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
  resourceGroups: (subscriptionId: string) =>
    ['azure', 'resourceGroups', subscriptionId] as const,
} as const;
