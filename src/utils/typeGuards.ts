import { AzureSubscription, AzureAppService, DatadogSite } from '../types';

/**
 * Type guard to check if an object is a valid Azure Subscription
 */
export function isAzureSubscription(obj: unknown): obj is AzureSubscription {
  return !!(
    obj &&
    typeof obj === 'object' &&
    obj !== null &&
    'subscriptionId' in obj &&
    'displayName' in obj &&
    'state' in obj &&
    'tenantId' in obj &&
    typeof (obj as any).subscriptionId === 'string' &&
    typeof (obj as any).displayName === 'string' &&
    typeof (obj as any).state === 'string' &&
    typeof (obj as any).tenantId === 'string'
  );
}

/**
 * Type guard to check if an object is a valid Azure App Service
 */
export function isAzureAppService(obj: unknown): obj is AzureAppService {
  return !!(
    obj &&
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'resourceGroup' in obj &&
    'location' in obj &&
    'kind' in obj &&
    'properties' in obj &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).name === 'string' &&
    typeof (obj as any).resourceGroup === 'string' &&
    typeof (obj as any).location === 'string' &&
    typeof (obj as any).kind === 'string' &&
    (obj as any).properties &&
    typeof (obj as any).properties === 'object' &&
    Array.isArray((obj as any).properties.hostNames) &&
    typeof (obj as any).properties.state === 'string'
  );
}

/**
 * Type guard to check if an object is a valid Datadog Site
 */
export function isDatadogSite(obj: unknown): obj is DatadogSite {
  return !!(
    obj &&
    typeof obj === 'object' &&
    obj !== null &&
    'value' in obj &&
    'label' in obj &&
    typeof (obj as any).value === 'string' &&
    typeof (obj as any).label === 'string'
  );
}

/**
 * Validates if a string is a valid Datadog API key format
 */
export function isValidDatadogApiKey(apiKey: string): boolean {
  // Datadog API keys are 32 character hex strings
  const datadogApiKeyRegex = /^[a-f0-9]{32}$/i;
  return datadogApiKeyRegex.test(apiKey);
}

/**
 * Validates if a string is a valid Azure subscription ID format
 */
export function isValidSubscriptionId(subscriptionId: string): boolean {
  // Azure subscription IDs are UUIDs (relaxed format)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(subscriptionId);
}

/**
 * Checks if an app service is running on Linux
 */
export function isLinuxAppService(appService: AzureAppService): boolean {
  return (
    appService.kind?.includes('linux') ||
    Boolean(appService.properties.siteConfig?.linuxFxVersion)
  );
}

/**
 * Checks if an app service is running on Windows
 */
export function isWindowsAppService(appService: AzureAppService): boolean {
  return !isLinuxAppService(appService);
}

/**
 * Extracts the resource group name from an Azure resource ID
 */
export function extractResourceGroupFromId(resourceId: string): string | null {
  const match = resourceId.match(/\/resourceGroups\/([^/]+)\//);
  return match?.[1] ?? null;
}

/**
 * Validates an array of Azure subscriptions
 */
export function validateSubscriptions(
  subscriptions: unknown[]
): AzureSubscription[] {
  return subscriptions.filter(isAzureSubscription);
}

/**
 * Validates an array of Azure app services
 */
export function validateAppServices(appServices: unknown[]): AzureAppService[] {
  return appServices.filter(isAzureAppService);
}
