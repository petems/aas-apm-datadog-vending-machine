// Azure subscription interface
export interface AzureSubscription {
  subscriptionId: string;
  displayName: string;
  state: string;
  tenantId: string;
}

// Azure App Service interface
export interface AzureAppService {
  id: string;
  name: string;
  resourceGroup: string;
  location: string;
  kind?: string | undefined;
  properties: {
    hostNames: string[];
    state: string;
    siteConfig?:
      | {
          linuxFxVersion?: string | undefined;
          windowsFxVersion?: string | undefined;
        }
      | undefined;
  };
}

// Datadog site options
export interface DatadogSite {
  value: string;
  label: string;
}

// Deployment parameters interface
export interface DeploymentParameters {
  siteName: string;
  location: string;
  ddApiKey: string;
  ddSite: string;
}

// ARM deployment template interface
export interface ARMTemplate {
  uri: string;
  isWindows: boolean;
}

// Application state interface
export interface AppState {
  isAuthenticated: boolean;
  subscriptions: AzureSubscription[];
  selectedSubscription: string;
  appServices: AzureAppService[];
  selectedAppService: string;
  selectedDatadogSite: string;
  ddApiKey: string;
  isLoading: boolean;
  error: string | null;
  deploymentStatus: 'idle' | 'deploying' | 'success' | 'error';
}
