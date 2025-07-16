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
  resourceGroup: z.string().min(1),
  location: z.string().min(1),
  kind: z.string().optional(),
  properties: z.object({
    hostNames: z.array(z.string()),
    state: z.string(),
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

// TypeScript types derived from Zod schemas
export type AzureSubscription = z.infer<typeof AzureSubscriptionSchema>;
export type AzureAppService = z.infer<typeof AzureAppServiceSchema>;
export type DatadogSite = z.infer<typeof DatadogSiteSchema>;
export type DeploymentParameters = z.infer<typeof DeploymentParametersSchema>;
export type DatadogFormData = z.infer<typeof DatadogFormSchema>;

// Additional types
export type DeploymentStatus = 'idle' | 'deploying' | 'success' | 'error';

export type LoadingState = {
  subscriptions: boolean;
  appServices: boolean;
  deployment: boolean;
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
  loadingState: LoadingState;
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
  appServiceDetails: (subscriptionId: string, resourceGroup: string, siteName: string) =>
    ['azure', 'appServiceDetails', subscriptionId, resourceGroup, siteName] as const,
} as const; 