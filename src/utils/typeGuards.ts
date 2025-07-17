import { AzureSubscription, AzureAppService, DatadogSite } from '../types';

/**
 * Type guard to check if an object is a valid Azure Subscription
 */
export function isAzureSubscription(obj: any): obj is AzureSubscription {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.subscriptionId === 'string' &&
    typeof obj.displayName === 'string' &&
    typeof obj.state === 'string' &&
    typeof obj.tenantId === 'string'
  );
}

/**
 * Type guard to check if an object is a valid Azure App Service
 */
export function isAzureAppService(obj: any): obj is AzureAppService {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.resourceGroup === 'string' &&
    typeof obj.location === 'string' &&
    typeof obj.kind === 'string' &&
    obj.properties &&
    typeof obj.properties === 'object' &&
    Array.isArray(obj.properties.hostNames) &&
    typeof obj.properties.state === 'string'
  );
}

/**
 * Type guard to check if an object is a valid Datadog Site
 */
export function isDatadogSite(obj: any): obj is DatadogSite {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.value === 'string' &&
    typeof obj.label === 'string'
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
  // Azure subscription IDs are UUIDs
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(subscriptionId);
}

/**
 * Checks if an app service is running on Linux
 */
export function isLinuxAppService(appService: AzureAppService): boolean {
  return (
    appService.kind.includes('linux') ||
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
  subscriptions: any[]
): AzureSubscription[] {
  return subscriptions.filter(isAzureSubscription);
}

/**
 * Validates an array of Azure app services
 */
export function validateAppServices(appServices: any[]): AzureAppService[] {
  return appServices.filter(isAzureAppService);
}
