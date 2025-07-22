import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DatadogSite, AzureSubscription } from '../types';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/cjs/languages/hljs/json';
import { githubGist } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

// Register JSON language
SyntaxHighlighter.registerLanguage('json', json);

// Define Datadog sites here since it's not exported from types yet
const DATADOG_SITES: DatadogSite[] = [
  { value: 'datadoghq.com', label: 'US1 (datadoghq.com)' },
  { value: 'datadoghq.eu', label: 'EU1 (datadoghq.eu)' },
  { value: 'us3.datadoghq.com', label: 'US3 (us3.datadoghq.com)' },
  { value: 'us5.datadoghq.com', label: 'US5 (us5.datadoghq.com)' },
  { value: 'ap1.datadoghq.com', label: 'AP1 (ap1.datadoghq.com)' },
];
import { AzureService } from '../services/azureService';
import LoadingSpinner from './LoadingSpinner';
import ErrorAlert from './ErrorAlert';

// Define schema here since it's not exported from types yet
const DatadogConfigFormSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
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
  enableAppServiceStorage: z.string().default('true'),
  // Deployment configuration fields
  sidecarImage: z.string().optional(),
  sidecarPort: z.string().optional(),
  sidecarRegistryUrl: z.string().optional(),
  sidecarStartupCommand: z.string().optional(),
  allowAccessToAllAppSettings: z.boolean().default(false),
  installWindowsExtension: z.boolean().default(false),
  // .NET-specific fields (conditional based on isDotNet)
  dotnetTracerHome: z.string().optional(),
  dotnetTraceLogDirectory: z.string().optional(),
  coreclrEnableProfiling: z.string().optional(),
  coreclrProfiler: z.string().optional(),
  coreclrProfilerPath: z.string().optional(),
});

type DatadogConfigFormData = {
  accessToken: string;
  subscription: string;
  resourceGroup: string;
  appService: string;
  datadogSite: string;
  apiKey: string;
  serviceName: string;
  environment: string;
  version?: string;
  logPath: string;
  isDotNet: boolean;
  enableAppServiceStorage: string;
  // Deployment configuration fields
  sidecarImage?: string;
  sidecarPort?: string;
  sidecarRegistryUrl?: string;
  sidecarStartupCommand?: string;
  allowAccessToAllAppSettings: boolean;
  installWindowsExtension: boolean;
  // .NET-specific fields
  dotnetTracerHome?: string;
  dotnetTraceLogDirectory?: string;
  coreclrEnableProfiling?: string;
  coreclrProfiler?: string;
  coreclrProfilerPath?: string;
};

type ConfigurationStep = {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
};

type DatadogConfigurationDetails = {
  containerName?: string;
  containerImage?: string;
  port?: string;
  status?: string;
  createdTime?: string;
  lastUpdated?: string;
  statusDetails?: Record<string, unknown>;
  extensionId?: string;
  version?: string;
  title?: string;
  state?: string;
};

const DatadogConfigPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<AzureSubscription[]>([]);
  const [resourceGroups, setResourceGroups] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [appServices, setAppServices] = useState<
    Array<{ id: string; name: string; resourceGroup: string }>
  >([]);
  const [selectedSubscription, setSelectedSubscription] = useState<string>('');
  const [selectedResourceGroup, setSelectedResourceGroup] =
    useState<string>('');
  const [subscriptionSearch, setSubscriptionSearch] = useState<string>('');
  const [resourceGroupSearch, setResourceGroupSearch] = useState<string>('');
  const [appServiceSearch, setAppServiceSearch] = useState<string>('');
  const [showSubscriptionDropdown, setShowSubscriptionDropdown] =
    useState<boolean>(false);
  const [showResourceGroupDropdown, setShowResourceGroupDropdown] =
    useState<boolean>(false);
  const [showAppServiceDropdown, setShowAppServiceDropdown] =
    useState<boolean>(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configurationSteps, setConfigurationSteps] = useState<
    ConfigurationStep[]
  >([]);
  const [configurationError, setConfigurationError] = useState<string | null>(
    null
  );
  const [configurationSuccess, setConfigurationSuccess] = useState(false);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [loadingResourceGroups, setLoadingResourceGroups] = useState(false);
  const [loadingAppServices, setLoadingAppServices] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [currentSettings, setCurrentSettings] = useState<Record<
    string,
    string
  > | null>(null);
  const [loadingCurrentSettings, setLoadingCurrentSettings] = useState(false);
  const [appServiceType, setAppServiceType] = useState<
    'Windows' | 'Linux' | 'Container' | null
  >(null);
  const [appServiceLanguage, setAppServiceLanguage] = useState<{
    language: string;
    version: string;
    rawRuntime: string;
  } | null>(null);
  const [datadogConfiguration, setDatadogConfiguration] = useState<{
    hasDatadogSetup: boolean;
    setupType: 'sidecar' | 'extension' | 'settings-only' | 'none';
    details: DatadogConfigurationDetails | null;
  } | null>(null);
  const [isLoadingContainerStatus, setIsLoadingContainerStatus] =
    useState(false);
  const [showStatusDetails, setShowStatusDetails] = useState(false);
  const [showFullJson, setShowFullJson] = useState(false);
  const [isCurrentSettingsCollapsed, setIsCurrentSettingsCollapsed] =
    useState(false);
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false);
  const [apiKeyCountdown, setApiKeyCountdown] = useState(0);
  const [appServicePlan, setAppServicePlan] = useState<{
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
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid },
  } = useForm<DatadogConfigFormData>({
    resolver: zodResolver(DatadogConfigFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      datadogSite: 'datadoghq.com',
      logPath: '/home/LogFiles/*.log',
      isDotNet: false,
      enableAppServiceStorage: 'true',
      // Deployment configuration defaults
      sidecarImage: 'datadog/serverless-init:latest',
      sidecarPort: '8126',
      installWindowsExtension: false,
      // .NET-specific defaults
      dotnetTracerHome: '/home/site/wwwroot/datadog',
      dotnetTraceLogDirectory: '/home/LogFiles/dotnet',
      coreclrEnableProfiling: '1',
      coreclrProfiler: '{846F5F1C-F9AE-4B07-969E-05C26BC060D8}',
      coreclrProfilerPath:
        '/home/site/wwwroot/datadog/linux-x64/Datadog.Trace.ClrProfiler.Native.so',
    },
  });

  const watchAccessToken = watch('accessToken');
  const watchSubscription = watch('subscription');
  const watchResourceGroup = watch('resourceGroup');
  const watchAppService = watch('appService');
  const watchIsDotNet = watch('isDotNet');
  const watchSidecarImage = watch('sidecarImage');
  const watchSidecarPort = watch('sidecarPort');
  const watchSidecarRegistryUrl = watch('sidecarRegistryUrl');

  // Load saved token from session storage on mount
  useEffect(() => {
    const savedToken = sessionStorage.getItem('azure-access-token');
    if (savedToken && savedToken.length > 100) {
      console.log('Loading saved token from session storage');
      setValue('accessToken', savedToken);
    }
  }, [setValue]);

  // Clear app service type, language, configuration, and current settings when selections change
  useEffect(() => {
    setCurrentSettings(null);
    setAppServiceType(null);
    setAppServiceLanguage(null);
    setDatadogConfiguration(null);
  }, [watchSubscription, watchResourceGroup, watchAppService]);

  // Handle API key countdown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (apiKeyRevealed && apiKeyCountdown > 0) {
      interval = setInterval(() => {
        setApiKeyCountdown(prev => {
          if (prev <= 1) {
            setApiKeyRevealed(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [apiKeyRevealed, apiKeyCountdown]);

  // Load subscriptions when access token changes
  useEffect(() => {
    if (watchAccessToken && watchAccessToken.length > 100) {
      // Basic token length check
      console.log('Valid token detected, loading subscriptions...');
      // Save valid token to session storage
      sessionStorage.setItem('azure-access-token', watchAccessToken);
      loadSubscriptions(watchAccessToken);
    } else {
      if (watchAccessToken) {
        console.log('Token too short:', watchAccessToken.length, 'characters');
        setDebugInfo(
          `Token too short: ${watchAccessToken.length} characters (minimum 100 required)`
        );
      }
      setSubscriptions([]);
      setResourceGroups([]);
      setAppServices([]);
      setSelectedSubscription('');
      setSelectedResourceGroup('');
      setSubscriptionSearch('');
      setResourceGroupSearch('');
      setAppServiceSearch('');
      setShowSubscriptionDropdown(false);
      setShowResourceGroupDropdown(false);
      setShowAppServiceDropdown(false);
      setValue('subscription', '');
      setValue('resourceGroup', '');
      setValue('appService', '');
    }
  }, [watchAccessToken, setValue]);

  // Load resource groups when subscription changes
  useEffect(() => {
    if (watchSubscription && watchAccessToken) {
      console.log('Subscription changed to:', watchSubscription);
      loadResourceGroups(watchAccessToken, watchSubscription);

      // Find the subscription details to update the selected state
      const subscription = subscriptions.find(
        sub => sub.subscriptionId === watchSubscription
      );
      if (subscription) {
        setSelectedSubscription(watchSubscription);
        setSubscriptionSearch(''); // Clear search to show selected indicator
      }

      setSelectedResourceGroup('');
      setResourceGroupSearch('');
      setShowResourceGroupDropdown(false);
      setValue('resourceGroup', '');
      setValue('appService', '');
    }
  }, [watchSubscription, watchAccessToken, setValue, subscriptions]);

  // Load app services when resource group is specifically selected
  useEffect(() => {
    if (selectedResourceGroup && watchSubscription && watchAccessToken) {
      loadAppServicesInResourceGroup(
        watchAccessToken,
        watchSubscription,
        selectedResourceGroup
      );
      setValue('appService', '');
    }
  }, [selectedResourceGroup, watchSubscription, watchAccessToken, setValue]);

  // Trigger validation for .NET-specific fields when isDotNet changes
  useEffect(() => {
    if (watchIsDotNet) {
      trigger([
        'dotnetTracerHome',
        'dotnetTraceLogDirectory',
        'coreclrEnableProfiling',
        'coreclrProfiler',
        'coreclrProfilerPath',
      ]);
    }
  }, [watchIsDotNet, trigger]);

  // Trigger validation for sidecar fields when app service type changes
  useEffect(() => {
    if (appServiceType === 'Linux') {
      trigger(['sidecarImage', 'sidecarPort', 'sidecarRegistryUrl']);
    }
  }, [appServiceType, trigger]);

  const loadSubscriptions = async (token: string) => {
    try {
      setLoadingSubscriptions(true);
      setApiError(null);
      setDebugInfo('Loading subscriptions...');
      const azureService = new AzureService(token);
      const subs = await azureService.getSubscriptions();
      console.log('Subscriptions found:', subs);
      // Sort subscriptions alphabetically by display name
      const sortedSubs = subs.sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      );
      setSubscriptions(sortedSubs);
      setDebugInfo(`Found ${subs.length} subscriptions`);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load subscriptions';
      setApiError(errorMessage);
      setDebugInfo(`Error loading subscriptions: ${errorMessage}`);
      setSubscriptions([]);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const loadResourceGroups = async (token: string, subscriptionId: string) => {
    try {
      setLoadingResourceGroups(true);
      setApiError(null);
      console.log('Loading resource groups for subscription:', subscriptionId);
      setDebugInfo(
        `Loading resource groups for subscription: ${subscriptionId}`
      );
      const azureService = new AzureService(token);
      const groups = await azureService.getResourceGroups(subscriptionId);
      console.log('Raw resource groups response:', groups);
      console.log('Number of resource groups found:', groups.length);

      setDebugInfo(`Found ${groups.length} resource groups`);

      // Map Azure SDK ResourceGroup to component expected format
      const mappedGroups = groups
        .filter(group => group.name && group.id) // Filter out groups without name or id
        .map(group => ({
          id: group.id!,
          name: group.name!,
        }));

      // Sort resource groups alphabetically by name
      const sortedGroups = mappedGroups.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setResourceGroups(sortedGroups);
    } catch (error) {
      console.error('Error loading resource groups:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to load resource groups';
      setApiError(errorMessage);
      setDebugInfo(`Error loading resource groups: ${errorMessage}`);
      setResourceGroups([]);
    } finally {
      setLoadingResourceGroups(false);
    }
  };

  const loadAppServicesInResourceGroup = async (
    token: string,
    subscriptionId: string,
    resourceGroupName: string
  ) => {
    try {
      setLoadingAppServices(true);
      setApiError(null);
      const azureService = new AzureService(token);
      const services = await azureService.getAppServicesInResourceGroup(
        subscriptionId,
        resourceGroupName
      );
      const mappedServices = services.map(service => ({
        id: service.name,
        name: service.name,
        resourceGroup: service.resourceGroup,
      }));
      // Sort app services alphabetically by name
      const sortedServices = mappedServices.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setAppServices(sortedServices);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load app services';
      setApiError(errorMessage);
      setAppServices([]);
    } finally {
      setLoadingAppServices(false);
    }
  };

  const onSubmit = async (data: DatadogConfigFormData) => {
    // Additional validation for Linux sidecar requirements
    if (appServiceType === 'Linux' && !data.isDotNet) {
      if (!data.sidecarImage || data.sidecarImage.trim() === '') {
        setConfigurationError(
          'Sidecar image is required for Linux App Services'
        );
        return;
      }
      if (!data.sidecarPort || data.sidecarPort.trim() === '') {
        setConfigurationError(
          'Sidecar port is required for Linux App Services'
        );
        return;
      }
    }

    setIsConfiguring(true);
    setConfigurationError(null);
    setConfigurationSuccess(false);

    const steps: ConfigurationStep[] = [
      {
        id: 'settings',
        name: 'Configure application settings',
        status: 'pending',
      },
      { id: 'restart', name: 'Restart application', status: 'pending' },
    ];

    // Add sidecar step for Linux apps
    if (appServiceType === 'Linux') {
      steps.splice(1, 0, {
        id: 'sidecar',
        name: 'Configure sidecar container',
        status: 'pending',
      });
    }

    setConfigurationSteps(steps);

    try {
      const azureService = new AzureService(data.accessToken);

      // Configuration options for future use
      const _configOptions = {
        apiKey: data.apiKey,
        site: data.datadogSite,
        service: data.serviceName,
        environment: data.environment,
        logPath: data.logPath,
        isDotNet: data.isDotNet,
        enableAppServiceStorage: data.enableAppServiceStorage,
        includeSidecar: !data.isDotNet,
        // Deployment configuration
        ...(data.sidecarImage && { sidecarImage: data.sidecarImage }),
        ...(data.sidecarPort && { sidecarPort: data.sidecarPort }),
        installWindowsExtension: data.installWindowsExtension,
        // Optional fields
        ...(data.version && { version: data.version }),
        ...(data.dotnetTracerHome && {
          dotnetTracerHome: data.dotnetTracerHome,
        }),
        ...(data.dotnetTraceLogDirectory && {
          dotnetTraceLogDirectory: data.dotnetTraceLogDirectory,
        }),
        ...(data.coreclrEnableProfiling && {
          coreclrEnableProfiling: data.coreclrEnableProfiling,
        }),
        ...(data.coreclrProfiler && { coreclrProfiler: data.coreclrProfiler }),
        ...(data.coreclrProfilerPath && {
          coreclrProfilerPath: data.coreclrProfilerPath,
        }),
      };

      // Configure basic Datadog settings using Azure SDK
      setConfigurationSteps(current =>
        current.map((step, index) =>
          index === 0 ? { ...step, status: 'running' as const } : step
        )
      );

      // Get current settings first
      const currentSettings = await azureService.getAppSettings(
        data.subscription,
        data.resourceGroup,
        data.appService
      );

      // Build Datadog settings
      const datadogSettings: Record<string, string> = {
        DD_API_KEY: data.apiKey,
        DD_SITE: data.datadogSite,
        DD_SERVICE: data.serviceName,
        DD_ENV: data.environment,
        DD_SERVERLESS_LOG_PATH: data.logPath,
        WEBSITES_ENABLE_APP_SERVICE_STORAGE: data.enableAppServiceStorage,
        DD_APM_ENABLED: 'true',
      };

      if (data.version) {
        datadogSettings.DD_VERSION = data.version;
      }

      // Add .NET specific settings if needed
      if (data.isDotNet) {
        datadogSettings.DD_DOTNET_TRACER_HOME =
          data.dotnetTracerHome || '/home/site/wwwroot/datadog';
        datadogSettings.DD_TRACE_LOG_DIRECTORY =
          data.dotnetTraceLogDirectory || '/home/LogFiles/dotnet';
        datadogSettings.CORECLR_ENABLE_PROFILING =
          data.coreclrEnableProfiling || '1';
        datadogSettings.CORECLR_PROFILER =
          data.coreclrProfiler || '{846F5F1C-F9AE-4B07-969E-05C26BC060D8}';
        datadogSettings.CORECLR_PROFILER_PATH =
          data.coreclrProfilerPath ||
          '/home/site/wwwroot/datadog/linux-x64/Datadog.Trace.ClrProfiler.Native.so';
      }

      // Add sidecar connection settings for non-.NET apps
      if (!data.isDotNet) {
        datadogSettings.DD_TRACE_AGENT_URL = 'http://datadog-sidecar:8126';
        datadogSettings.DD_DOGSTATSD_URL = 'udp://datadog-sidecar:8125';
      }

      // Merge with existing settings
      const updatedSettings = { ...currentSettings, ...datadogSettings };

      // Update app settings
      await azureService.updateAppSettings(
        data.subscription,
        data.resourceGroup,
        data.appService,
        updatedSettings
      );

      // Mark settings step as complete
      setConfigurationSteps(current =>
        current.map((step, _index) =>
          _index === 0
            ? { ...step, status: 'completed' as const }
            : _index === 1
              ? { ...step, status: 'running' as const }
              : step
        )
      );

      // Configure sidecar if requested
      if (appServiceType === 'Linux' && data.sidecarImage) {
        setConfigurationSteps(current =>
          current.map((step, index) =>
            step.id === 'sidecar'
              ? { ...step, status: 'running' as const }
              : step
          )
        );

        await azureService.configureSidecarContainer(
          data.subscription,
          data.resourceGroup,
          data.appService,
          {
            apiKey: data.apiKey,
            site: data.datadogSite,
            sidecarImage: data.sidecarImage,
            sidecarPort: data.sidecarPort || '8126',
            ...(data.sidecarRegistryUrl && {
              sidecarRegistryUrl: data.sidecarRegistryUrl,
            }),
            ...(data.sidecarStartupCommand && {
              sidecarStartupCommand: data.sidecarStartupCommand,
            }),
            allowAccessToAllAppSettings: data.allowAccessToAllAppSettings,
          }
        );

        // Mark sidecar step as complete
        setConfigurationSteps(current =>
          current.map((step, index) =>
            step.id === 'sidecar'
              ? { ...step, status: 'completed' as const }
              : step
          )
        );
      }

      // Mark sidecar step as complete and start restart step
      setConfigurationSteps(current =>
        current.map((step, _index) =>
          _index <= 1
            ? { ...step, status: 'completed' as const }
            : _index === 2
              ? { ...step, status: 'running' as const }
              : step
        )
      );

      await azureService.restartAppService(
        data.subscription,
        data.resourceGroup,
        data.appService
      );

      // Mark all steps as completed
      setConfigurationSteps(current =>
        current.map(step => ({ ...step, status: 'completed' as const }))
      );
      setConfigurationSuccess(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Configuration failed';
      setConfigurationError(errorMessage);

      // Mark current running step as error
      setConfigurationSteps(current =>
        current.map(step =>
          step.status === 'running'
            ? { ...step, status: 'error' as const, error: errorMessage }
            : step
        )
      );
    } finally {
      setIsConfiguring(false);
    }
  };

  const resetConfiguration = () => {
    setConfigurationSteps([]);
    setConfigurationError(null);
    setConfigurationSuccess(false);
  };

  const fetchCurrentSettings = async () => {
    if (
      !watchAccessToken ||
      !watchSubscription ||
      !watchResourceGroup ||
      !watchAppService
    ) {
      setDebugInfo(
        'Please complete all selections (subscription, resource group, and app service) to fetch current settings'
      );
      return;
    }

    try {
      setLoadingCurrentSettings(true);
      setApiError(null);
      console.log(
        'Fetching current settings and app service details for:',
        watchAppService
      );

      const azureService = new AzureService(watchAccessToken);

      // Fetch app settings, app service details, and configuration in parallel
      const [
        settings,
        appServiceDetails,
        _sidecarConfig,
        extensions,
        siteContainers,
      ] = await Promise.all([
        azureService.getAppSettings(
          watchSubscription,
          watchResourceGroup,
          watchAppService
        ),
        azureService.getAppServiceDetails(
          watchSubscription,
          watchResourceGroup,
          watchAppService
        ),
        azureService
          .getSidecarConfiguration(
            watchSubscription,
            watchResourceGroup,
            watchAppService
          )
          .catch(error => {
            console.warn('Could not fetch sidecar configuration:', error);
            return null;
          }),
        azureService
          .getInstalledExtensions(
            watchSubscription,
            watchResourceGroup,
            watchAppService
          )
          .catch(error => {
            console.warn('Could not fetch extensions:', error);
            return [];
          }),
        azureService
          .getSiteContainers(
            watchSubscription,
            watchResourceGroup,
            watchAppService
          )
          .catch(error => {
            console.warn('Could not fetch sitecontainers:', error);
            return [];
          }),
      ]);

      console.log('Current app settings:', settings);
      console.log('App service details:', appServiceDetails);

      // Determine app service type and language
      // Enhanced runtime detection using Azure SDK data
      const serviceType = appServiceDetails?.kind
        ?.toLowerCase()
        .includes('linux')
        ? 'Linux'
        : 'Windows';

      // Detect runtime from kind and siteConfig
      const kind = appServiceDetails?.kind?.toLowerCase() || '';
      // Try to get from site config (now properly mapped from Azure SDK)
      const linuxFxVersion =
        appServiceDetails?.properties?.siteConfig?.linuxFxVersion || '';
      const windowsFxVersion =
        appServiceDetails?.properties?.siteConfig?.windowsFxVersion || '';

      let language = 'Unknown';
      let version = '';

      // Detect based on kind first
      if (kind.includes('functionapp')) {
        language = 'Azure Functions';
        if (kind.includes('node')) version = 'Node.js';
        else if (kind.includes('dotnet')) version = '.NET';
        else if (kind.includes('python')) version = 'Python';
        else if (kind.includes('java')) version = 'Java';
      } else if (kind.includes('app')) {
        // Regular App Service - check FX versions
        if (linuxFxVersion) {
          if (linuxFxVersion.startsWith('DOTNETCORE|')) {
            language = '.NET Core';
            version = linuxFxVersion.replace('DOTNETCORE|', '');
          } else if (linuxFxVersion.startsWith('NODE|')) {
            language = 'Node.js';
            version = linuxFxVersion.replace('NODE|', '');
          } else if (linuxFxVersion.startsWith('PYTHON|')) {
            language = 'Python';
            version = linuxFxVersion.replace('PYTHON|', '');
          } else if (linuxFxVersion.startsWith('PHP|')) {
            language = 'PHP';
            version = linuxFxVersion.replace('PHP|', '');
          } else if (linuxFxVersion.startsWith('JAVA|')) {
            language = 'Java';
            version = linuxFxVersion.replace('JAVA|', '');
          } else if (linuxFxVersion.startsWith('DOCKER|')) {
            language = 'Docker';
            version = 'Container';
          } else {
            // Unknown Linux runtime
            language = 'Linux';
            version = linuxFxVersion;
          }
        } else if (windowsFxVersion) {
          if (windowsFxVersion.includes('dotnet')) {
            language = '.NET Framework';
            version = windowsFxVersion;
          } else if (windowsFxVersion.includes('node')) {
            language = 'Node.js';
            version = windowsFxVersion;
          } else {
            language = 'Windows';
            version = windowsFxVersion;
          }
        } else if (serviceType === 'Windows') {
          // Default for Windows without explicit FX version
          language = '.NET Framework';
          version = 'Default';
        } else {
          // Linux without FX version - try to detect runtime from app settings as fallback
          if (settings) {
            // Check for .NET Core indicators
            if (
              settings.CORECLR_ENABLE_PROFILING ||
              settings.CORECLR_PROFILER ||
              settings.CORECLR_PROFILER_PATH
            ) {
              language = '.NET Core';
              version = 'Linux';
            }
            // Check for .NET indicators
            else if (
              settings.COMPlus_EnableDiagnostics !== undefined ||
              settings.DOTNET_BUNDLE_EXTRACT_BASE_DIR
            ) {
              language = '.NET';
              version = 'Linux';
            }
            // Check for Node.js indicators
            else if (
              settings.WEBSITE_NODE_DEFAULT_VERSION ||
              settings.NODE_ENV
            ) {
              language = 'Node.js';
              version =
                settings.WEBSITE_NODE_DEFAULT_VERSION || 'Unknown version';
            }
            // Check for Python indicators
            else if (settings.PYTHON_VERSION || settings.PYTHONPATH) {
              language = 'Python';
              version = settings.PYTHON_VERSION || 'Unknown version';
            }
            // Check for Java indicators
            else if (settings.JAVA_HOME || settings.JAVA_OPTS) {
              language = 'Java';
              version = 'Unknown version';
            }
            // Check for PHP indicators
            else if (settings.PHP_VERSION) {
              language = 'PHP';
              version = settings.PHP_VERSION;
            } else {
              language = 'Linux App Service';
              version = 'Runtime not detected';
            }
          } else {
            // Fallback to generic Linux
            language = 'Linux App Service';
            version = 'Runtime not detected';
          }
        }
      } else {
        language = 'Unknown';
        version = 'Unknown kind: ' + kind;
      }

      const serviceLanguage = {
        language,
        version,
        rawRuntime: linuxFxVersion || windowsFxVersion || kind || 'Unknown',
      };

      // Analyze Datadog configuration
      let datadogConfig: {
        hasDatadogSetup: boolean;
        setupType: 'sidecar' | 'extension' | 'settings-only' | 'none';
        details: any;
      } = {
        hasDatadogSetup: false,
        setupType: 'none',
        details: {},
      };

      // Check for sidecar containers (Linux)
      if (
        serviceType === 'Linux' &&
        siteContainers &&
        siteContainers.length > 0
      ) {
        const datadogSidecar = siteContainers.find(
          container =>
            container.name?.toLowerCase().includes('datadog') ||
            container.image?.toLowerCase().includes('datadog')
        );

        if (datadogSidecar) {
          datadogConfig = {
            hasDatadogSetup: true,
            setupType: 'sidecar',
            details: {
              containerName: datadogSidecar.name,
              containerImage: datadogSidecar.image,
              port: datadogSidecar.targetPort || '8126',
              status: 'Checking...',
              createdTime: new Date().toISOString(),
            },
          };
        }
      }

      // Check for Windows extensions
      if (serviceType === 'Windows' && extensions && extensions.length > 0) {
        const datadogExtension = extensions.find(ext =>
          ext.id?.toLowerCase().includes('datadog')
        );

        if (datadogExtension) {
          datadogConfig = {
            hasDatadogSetup: true,
            setupType: 'extension',
            details: {
              extensionId: datadogExtension.id,
              version: datadogExtension.version || 'Unknown',
              status: 'Installed',
            },
          };
        }
      }

      // Set initial configuration with "Checking..." status
      setCurrentSettings(settings);
      setAppServiceType(serviceType);
      setAppServiceLanguage(serviceLanguage);
      setDatadogConfiguration(datadogConfig);
      setIsCurrentSettingsCollapsed(false);

      // Fetch app service plan details
      await fetchAppServicePlan();

      // Auto-populate deployment configuration fields based on app service type
      if (serviceType === 'Linux') {
        console.log(
          '🔧 Auto-populating sidecar configuration for Linux app service'
        );
        setValue('sidecarImage', 'datadog/serverless-init:latest');
        setValue('sidecarPort', '8126');
        setValue('sidecarRegistryUrl', 'index.docker.io', {
          shouldValidate: true,
          shouldDirty: true,
        });
        setValue('sidecarStartupCommand', '', {
          shouldValidate: true,
          shouldDirty: true,
        });
        setValue('allowAccessToAllAppSettings', true, {
          shouldValidate: true,
          shouldDirty: true,
        });

        // Immediate verification
        console.log(
          '🔍 Immediate verification - sidecarRegistryUrl:',
          watch('sidecarRegistryUrl')
        );
        console.log('✅ Sidecar configuration populated:', {
          image: 'datadog/serverless-init:latest',
          port: '8126',
          registryUrl: 'index.docker.io',
          startupCommand: '',
          allowAccessToAllAppSettings: true,
        });

        // Force form re-validation
        setTimeout(() => {
          trigger(['sidecarRegistryUrl', 'sidecarImage', 'sidecarPort']);
          console.log('🔍 Verifying form values after setValue and trigger:', {
            sidecarImage: watch('sidecarImage'),
            sidecarPort: watch('sidecarPort'),
            sidecarRegistryUrl: watch('sidecarRegistryUrl'),
            sidecarStartupCommand: watch('sidecarStartupCommand'),
            allowAccessToAllAppSettings: watch('allowAccessToAllAppSettings'),
          });
        }, 100);
      } else if (serviceType === 'Windows') {
        setValue('installWindowsExtension', true);
      }

      // If we found a sidecar container, fetch its actual status
      if (
        datadogConfig.setupType === 'sidecar' &&
        datadogConfig.details.containerName
      ) {
        try {
          console.log('🚀 Starting sidecar status fetch...');
          console.log('  Container name:', datadogConfig.details.containerName);
          console.log('  Subscription:', watchSubscription);
          console.log('  Resource group:', watchResourceGroup);
          console.log('  App service:', watchAppService);
          console.log(
            '  Datadog config details:',
            JSON.stringify(datadogConfig.details, null, 2)
          );

          setIsLoadingContainerStatus(true);

          const containerStatus = await azureService.getSiteContainerStatus(
            watchSubscription,
            watchResourceGroup,
            watchAppService,
            datadogConfig.details.containerName
          );

          console.log(
            '📊 Final status response:',
            JSON.stringify(containerStatus, null, 2)
          );

          if (containerStatus) {
            console.log('✅ Processing container status:', containerStatus);

            // Try multiple fields to extract status
            let extractedStatus = 'Unknown';

            if (containerStatus.status) {
              extractedStatus = containerStatus.status;
            } else if (containerStatus.state) {
              extractedStatus = containerStatus.state;
            } else if (containerStatus.properties?.status) {
              extractedStatus = containerStatus.properties.status;
            } else if (containerStatus.properties?.state) {
              extractedStatus = containerStatus.properties.state;
            } else if (containerStatus.properties?.runState) {
              extractedStatus = containerStatus.properties.runState;
            } else if (containerStatus.details?.status) {
              extractedStatus = containerStatus.details.status;
            } else {
              // If we got a response but no clear status, assume running
              extractedStatus = 'Running';
            }

            console.log('📈 Extracted status:', extractedStatus);

            // Update the configuration with real status information
            const updatedConfig = {
              ...datadogConfig,
              details: {
                ...datadogConfig.details,
                status: extractedStatus,
                statusDetails: containerStatus,
                lastUpdated: new Date().toISOString(),
              },
            };

            setDatadogConfiguration(updatedConfig);
          } else {
            console.log('❌ No status response received');
            // Update status to show we couldn't get it
            const updatedConfig = {
              ...datadogConfig,
              details: {
                ...datadogConfig.details,
                status: 'Status unavailable',
              },
            };
            setDatadogConfiguration(updatedConfig);
          }
        } catch (error) {
          console.warn('Could not fetch container status:', error);
          // Update status to show error
          const updatedConfig = {
            ...datadogConfig,
            details: {
              ...datadogConfig.details,
              status: 'Status fetch failed',
            },
          };
          setDatadogConfiguration(updatedConfig);
        } finally {
          setIsLoadingContainerStatus(false);
        }
      }

      console.log('App service type detected:', serviceType);
      console.log('App service language detected:', serviceLanguage);
      console.log('Datadog configuration analysis:', datadogConfig);

      // Check for existing Datadog settings
      const datadogKeys = Object.keys(settings).filter(
        key =>
          key.toLowerCase().includes('datadog') ||
          key.toLowerCase().includes('dd_') ||
          key === 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
      );

      const languageInfo = serviceLanguage
        ? ` - ${serviceLanguage.language} ${serviceLanguage.version}`
        : '';
      if (datadogKeys.length > 0) {
        setDebugInfo(
          `Settings fetched for <a href="${getAzurePortalUrl(watchSubscription, watchResourceGroup, watchAppService)}" target="_blank" rel="noopener noreferrer" class="inline-block px-2 py-1 bg-blue-50 border border-blue-200 rounded-full text-blue-800 font-mono text-xs hover:bg-blue-100 hover:border-blue-300 transition-colors cursor-pointer" title="Open in Azure Portal">${watchAppService} 🔗</a> (${serviceType}${languageInfo}). Found ${datadogKeys.length} Datadog-related settings.`
        );
      } else {
        setDebugInfo(
          `Settings fetched for <a href="${getAzurePortalUrl(watchSubscription, watchResourceGroup, watchAppService)}" target="_blank" rel="noopener noreferrer" class="inline-block px-2 py-1 bg-blue-50 border border-blue-200 rounded-full text-blue-800 font-mono text-xs hover:bg-blue-100 hover:border-blue-300 transition-colors cursor-pointer" title="Open in Azure Portal">${watchAppService} 🔗</a> (${serviceType}${languageInfo}). No existing Datadog settings found.`
        );
      }
    } catch (error) {
      console.error('Error fetching current settings:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch current settings';
      setApiError(errorMessage);
      setDebugInfo(`Error fetching settings: ${errorMessage}`);
      setCurrentSettings(null);
      setAppServiceType(null);
      setAppServiceLanguage(null);
      setDatadogConfiguration(null);
    } finally {
      setLoadingCurrentSettings(false);
    }
  };

  const SENSITIVE_KEYS = ['DD_API_KEY', 'DATADOG_API_KEY'];

  const DOTNET_SPECIFIC_SETTINGS = [
    'DD_DOTNET_TRACER_HOME',
    'DD_TRACE_LOG_DIRECTORY',
    'CORECLR_ENABLE_PROFILING',
    'CORECLR_PROFILER',
    'CORECLR_PROFILER_PATH',
    'WEBSITES_ENABLE_APP_SERVICE_STORAGE',
  ];

  const isSensitiveKey = (key: string): boolean => {
    return SENSITIVE_KEYS.includes(key);
  };

  const isDotNetRuntime = (): boolean => {
    return (
      appServiceLanguage?.language === '.NET' ||
      appServiceLanguage?.language === '.NET Core'
    );
  };

  const redactSensitiveValue = (key: string, value: string): string => {
    if (!isSensitiveKey(key) || !value) {
      return value;
    }

    if (value.length > 3) {
      const lastThree = value.slice(-3);
      return `${'*'.repeat(Math.max(0, value.length - 3))}${lastThree}`;
    }

    // For very short values (3 chars or less), show all asterisks
    return '*'.repeat(value.length);
  };

  // Generate Azure portal URL for an App Service
  const getAzurePortalUrl = (
    subscriptionId: string,
    resourceGroup: string,
    appServiceName: string
  ): string => {
    return `https://portal.azure.com/#@/resource/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${appServiceName}`;
  };

  // Generate Azure portal URL for an App Service Plan
  const getAppServicePlanUrl = (
    subscriptionId: string,
    resourceGroup: string,
    planName: string
  ): string => {
    return `https://portal.azure.com/#@/resource/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/serverfarms/${planName}`;
  };

  // Fetch App Service Plan details
  const fetchAppServicePlan = async () => {
    if (
      !watchAccessToken ||
      !watchSubscription ||
      !watchResourceGroup ||
      !watchAppService
    ) {
      return;
    }

    try {
      const azureService = new AzureService(watchAccessToken);

      // First get the app service details to find the plan ID
      const appServiceDetails = await azureService.getAppServiceDetails(
        watchSubscription,
        watchResourceGroup,
        watchAppService
      );

      if ((appServiceDetails.properties as any)?.serverFarmId) {
        // Extract plan name from serverFarmId
        const planIdParts = (
          appServiceDetails.properties as any
        ).serverFarmId.split('/');
        const planName = planIdParts[planIdParts.length - 1];

        // Fetch the plan details
        const plan = await azureService.getAppServicePlan(
          watchSubscription,
          watchResourceGroup,
          planName
        );

        setAppServicePlan(plan);
      }
    } catch (error) {
      console.error('Error fetching app service plan:', error);
      // Don't set error state for plan fetch - it's optional
    }
  };

  const formatContainerStatusDetails = (
    statusDetails: Record<string, unknown>
  ): string => {
    try {
      // Extract key information for human-readable format
      const container = statusDetails as any;

      let html = '<div class="space-y-4">';

      // Container Information Section
      html += `
        <div class="border border-purple-200 rounded-lg overflow-hidden">
          <div class="bg-purple-100 px-4 py-2 border-b border-purple-200">
            <h3 class="font-semibold text-purple-800 text-sm">📦 Container Information</h3>
          </div>
          <table class="w-full text-xs">
            <tbody>
              <tr class="border-b border-purple-100"><td class="px-4 py-2 font-medium text-purple-700 bg-purple-50 w-1/3">Name</td><td class="px-4 py-2 text-purple-600 font-mono">${container.name || 'N/A'}</td></tr>
              <tr class="border-b border-purple-100"><td class="px-4 py-2 font-medium text-purple-700 bg-purple-50 w-1/3">Type</td><td class="px-4 py-2 text-purple-600">${container.type || 'N/A'}</td></tr>
              <tr class="border-b border-purple-100"><td class="px-4 py-2 font-medium text-purple-700 bg-purple-50 w-1/3">Location</td><td class="px-4 py-2 text-purple-600">${container.location || 'N/A'}</td></tr>
              <tr class="border-b border-purple-100"><td class="px-4 py-2 font-medium text-purple-700 bg-purple-50 w-1/3">Image</td><td class="px-4 py-2 text-purple-600 font-mono break-all">${container.image || 'N/A'}</td></tr>
              <tr class="border-b border-purple-100"><td class="px-4 py-2 font-medium text-purple-700 bg-purple-50 w-1/3">Port</td><td class="px-4 py-2 text-purple-600 font-mono">${container.targetPort || 'N/A'}</td></tr>
              <tr class="border-b border-purple-100"><td class="px-4 py-2 font-medium text-purple-700 bg-purple-50 w-1/3">Main Container</td><td class="px-4 py-2 text-purple-600">${container.isMain ? 'Yes' : 'No'}</td></tr>
              <tr class="border-b border-purple-100"><td class="px-4 py-2 font-medium text-purple-700 bg-purple-50 w-1/3">Startup Command</td><td class="px-4 py-2 text-purple-600 font-mono">${container.startUpCommand || 'None'}</td></tr>
              <tr><td class="px-4 py-2 font-medium text-purple-700 bg-purple-50 w-1/3">Authentication</td><td class="px-4 py-2 text-purple-600">${container.authType || 'N/A'}</td></tr>
            </tbody>
          </table>
        </div>
      `;

      // Timestamps Section
      html += `
        <div class="border border-purple-200 rounded-lg overflow-hidden">
          <div class="bg-purple-100 px-4 py-2 border-b border-purple-200">
            <h3 class="font-semibold text-purple-800 text-sm">🕒 Timestamps</h3>
          </div>
          <table class="w-full text-xs">
            <tbody>
              <tr class="border-b border-purple-100"><td class="px-4 py-2 font-medium text-purple-700 bg-purple-50 w-1/3">Created</td><td class="px-4 py-2 text-purple-600">${container.createdTime ? new Date(container.createdTime).toLocaleString() : 'N/A'}</td></tr>
              <tr><td class="px-4 py-2 font-medium text-purple-700 bg-purple-50 w-1/3">Last Modified</td><td class="px-4 py-2 text-purple-600">${container.lastModifiedTime ? new Date(container.lastModifiedTime).toLocaleString() : 'N/A'}</td></tr>
            </tbody>
          </table>
        </div>
      `;

      // Configuration Section
      html += `
        <div class="border border-purple-200 rounded-lg overflow-hidden">
          <div class="bg-purple-100 px-4 py-2 border-b border-purple-200">
            <h3 class="font-semibold text-purple-800 text-sm">⚙️ Configuration</h3>
          </div>
          <table class="w-full text-xs">
            <tbody>
              <tr class="border-b border-purple-100"><td class="px-4 py-2 font-medium text-purple-700 bg-purple-50 w-1/3">Environment Variables</td><td class="px-4 py-2 text-purple-600">${container.environmentVariables ? `${container.environmentVariables.length} variables configured` : 'None'}</td></tr>
              <tr class="border-b border-purple-100"><td class="px-4 py-2 font-medium text-purple-700 bg-purple-50 w-1/3">Volume Mounts</td><td class="px-4 py-2 text-purple-600">${container.volumeMounts ? `${container.volumeMounts.length} mounts configured` : 'None'}</td></tr>
              <tr><td class="px-4 py-2 font-medium text-purple-700 bg-purple-50 w-1/3">User Managed Identity</td><td class="px-4 py-2 text-purple-600">${container.userManagedIdentityClientId || 'Not configured'}</td></tr>
            </tbody>
          </table>
        </div>
      `;

      // Environment Variables Section (if they exist)
      if (
        container.environmentVariables &&
        Array.isArray(container.environmentVariables) &&
        container.environmentVariables.length > 0
      ) {
        html += `
          <div class="border border-purple-200 rounded-lg overflow-hidden">
            <div class="bg-purple-100 px-4 py-2 border-b border-purple-200">
              <h3 class="font-semibold text-purple-800 text-sm">🔧 Environment Variables (${container.environmentVariables.length})</h3>
            </div>
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-purple-50">
                  <th class="px-4 py-2 text-left font-medium text-purple-700 border-b border-purple-200">Variable</th>
                  <th class="px-4 py-2 text-left font-medium text-purple-700 border-b border-purple-200">Value</th>
                </tr>
              </thead>
              <tbody>
        `;

        container.environmentVariables.forEach((env: any, index: number) => {
          html += `
            <tr class="border-b border-purple-100">
              <td class="px-4 py-2 font-medium text-purple-700 bg-purple-50 font-mono">${env.name}</td>
              <td class="px-4 py-2 text-purple-600 font-mono">${env.value}</td>
            </tr>
          `;
        });

        html += `
              </tbody>
            </table>
          </div>
        `;
      }

      // Volume Mounts Section (if they exist)
      if (
        container.volumeMounts &&
        Array.isArray(container.volumeMounts) &&
        container.volumeMounts.length > 0
      ) {
        html += `
          <div class="border border-purple-200 rounded-lg overflow-hidden">
            <div class="bg-purple-100 px-4 py-2 border-b border-purple-200">
              <h3 class="font-semibold text-purple-800 text-sm">📁 Volume Mounts (${container.volumeMounts.length})</h3>
            </div>
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-purple-50">
                  <th class="px-4 py-2 text-left font-medium text-purple-700 border-b border-purple-200">Name</th>
                  <th class="px-4 py-2 text-left font-medium text-purple-700 border-b border-purple-200">Mount Path</th>
                </tr>
              </thead>
              <tbody>
        `;

        container.volumeMounts.forEach((mount: any, index: number) => {
          html += `
            <tr class="border-b border-purple-100">
              <td class="px-4 py-2 font-medium text-purple-700 bg-purple-50">${mount.name || 'Unnamed'}</td>
              <td class="px-4 py-2 text-purple-600 font-mono">${mount.mountPath || 'N/A'}</td>
            </tr>
          `;
        });

        html += `
              </tbody>
            </table>
          </div>
        `;
      }

      html += '</div>';
      return html;
    } catch (error) {
      // Fallback to original format if parsing fails
      return `<pre class="text-xs">${JSON.stringify(statusDetails, null, 2)}</pre>`;
    }
  };

  const prefillFromCurrentSettings = () => {
    if (!currentSettings) return;

    let apiKeyFound = false;
    let fieldsUpdated: string[] = [];

    // Map and set form fields based on current settings
    Object.entries(currentSettings).forEach(([key, value]) => {
      if (!value) return;

      switch (key) {
        case 'DD_API_KEY':
        case 'DATADOG_API_KEY':
          apiKeyFound = true;
          setValue('apiKey', String(value)); // Actually set the value for copying/reuse
          fieldsUpdated.push('apiKey (pre-filled from existing configuration)');
          break;
        case 'DD_SITE':
        case 'DATADOG_SITE':
          setValue('datadogSite', String(value));
          fieldsUpdated.push('datadogSite');
          break;
        case 'DD_SERVICE':
        case 'DATADOG_SERVICE':
          setValue('serviceName', String(value));
          fieldsUpdated.push('serviceName');
          break;
        case 'DD_VERSION':
        case 'DATADOG_VERSION':
          setValue('version', String(value));
          fieldsUpdated.push('version');
          break;
        case 'DD_ENV':
        case 'DATADOG_ENV':
          setValue('environment', String(value));
          fieldsUpdated.push('environment');
          break;
        // .NET-specific settings
        case 'DD_DOTNET_TRACER_HOME':
          setValue('dotnetTracerHome', String(value));
          setValue('isDotNet', true); // Auto-enable .NET mode if we find .NET settings
          fieldsUpdated.push('dotnetTracerHome and .NET mode');
          break;
        case 'DD_TRACE_LOG_DIRECTORY':
          setValue('dotnetTraceLogDirectory', String(value));
          setValue('isDotNet', true);
          fieldsUpdated.push('dotnetTraceLogDirectory and .NET mode');
          break;
        case 'CORECLR_ENABLE_PROFILING':
          setValue('coreclrEnableProfiling', String(value));
          setValue('isDotNet', true);
          fieldsUpdated.push('coreclrEnableProfiling and .NET mode');
          break;
        case 'CORECLR_PROFILER':
          setValue('coreclrProfiler', String(value));
          setValue('isDotNet', true);
          fieldsUpdated.push('coreclrProfiler and .NET mode');
          break;
        case 'CORECLR_PROFILER_PATH':
          setValue('coreclrProfilerPath', String(value));
          setValue('isDotNet', true);
          fieldsUpdated.push('coreclrProfilerPath and .NET mode');
          break;
        case 'WEBSITES_ENABLE_APP_SERVICE_STORAGE': {
          // Handle various possible values from Azure (true, "true", "True", "1", etc.)
          const rawValue = String(value).toLowerCase().trim();
          const storageValue =
            rawValue === 'true' || rawValue === '1' ? 'true' : 'false';
          console.log('Pre-filling WEBSITES_ENABLE_APP_SERVICE_STORAGE:', {
            original: value,
            raw: rawValue,
            converted: storageValue,
          });
          setValue('enableAppServiceStorage', storageValue, {
            shouldValidate: true,
            shouldDirty: true,
          });
          // Force the form to re-render and update the dropdown
          setTimeout(() => trigger('enableAppServiceStorage'), 10);
          fieldsUpdated.push(`enableAppServiceStorage (${storageValue})`);
          break;
        }
        case 'DD_SERVERLESS_LOG_PATH':
          setValue('logPath', String(value));
          fieldsUpdated.push('logPath');
          break;
        // Deployment configuration settings
        case 'WEBSITES_PORT':
          setValue('sidecarPort', String(value));
          fieldsUpdated.push('sidecarPort');
          break;
      }
    });

    if (fieldsUpdated.length > 0) {
      const message = `✅ Pre-filled ${fieldsUpdated.length} fields: ${fieldsUpdated.join(', ')}${apiKeyFound ? '. Note: API key is visually redacted in current settings but has been copied to the form.' : ''}`;
      setDebugInfo(message);

      // Debug: Log current form values after pre-filling
      console.log('Form values after pre-fill:', {
        enableAppServiceStorage: watch('enableAppServiceStorage'),
        datadogSite: watch('datadogSite'),
        serviceName: watch('serviceName'),
        environment: watch('environment'),
        logPath: watch('logPath'),
      });

      // Show a brief success message
      setTimeout(() => {
        setDebugInfo(
          'Form fields pre-filled successfully! Please verify and update as needed.'
        );
      }, 3000);

      // Trigger validation for all relevant fields after pre-filling
      setTimeout(() => {
        trigger([
          'apiKey',
          'datadogSite',
          'serviceName',
          'environment',
          'version',
          'logPath',
          'sidecarImage',
          'sidecarPort',
          'sidecarRegistryUrl',
          'dotnetTracerHome',
          'dotnetTraceLogDirectory',
          'coreclrEnableProfiling',
          'coreclrProfiler',
          'coreclrProfilerPath',
        ]);
      }, 100);
    } else {
      setDebugInfo('No matching Datadog settings found to pre-fill');
    }
  };

  // Filter subscriptions based on search
  const filteredSubscriptions = subscriptions.filter(
    sub =>
      sub.displayName
        .toLowerCase()
        .includes(subscriptionSearch.toLowerCase()) ||
      sub.subscriptionId
        .toLowerCase()
        .includes(subscriptionSearch.toLowerCase())
  );

  // Filter resource groups based on search
  const filteredResourceGroups = resourceGroups.filter(rg =>
    rg.name.toLowerCase().includes(resourceGroupSearch.toLowerCase())
  );

  // Filter app services based on search
  const filteredAppServices = appServices.filter(
    app =>
      app.name.toLowerCase().includes(appServiceSearch.toLowerCase()) ||
      app.resourceGroup.toLowerCase().includes(appServiceSearch.toLowerCase())
  );

  const handleSubscriptionSearch = (value: string) => {
    console.log('🔍 Searching subscriptions for:', value);
    setSubscriptionSearch(value);

    // Filter based on the new value
    const filtered = subscriptions.filter(
      sub =>
        sub.displayName.toLowerCase().includes(value.toLowerCase()) ||
        sub.subscriptionId.toLowerCase().includes(value.toLowerCase())
    );

    console.log('📊 Subscription search results:', {
      searchTerm: value,
      totalSubscriptions: subscriptions.length,
      filteredCount: filtered.length,
      sampleResults: filtered.slice(0, 5).map(sub => sub.displayName),
    });

    // Show dropdown if there's a search term and results, or show preview if no search term
    setShowSubscriptionDropdown(
      (value.length > 0 && filtered.length > 0) ||
        (value.length === 0 && subscriptions.length > 0)
    );
    setValue('subscription', value);
  };

  const selectSubscription = (subscription: AzureSubscription) => {
    setSelectedSubscription(subscription.subscriptionId);
    setSubscriptionSearch(''); // Clear search to show selected indicator
    setShowSubscriptionDropdown(false);
    setValue('subscription', subscription.subscriptionId);

    // Clear dependent fields when subscription changes
    setSelectedResourceGroup('');
    setResourceGroupSearch('');
    setAppServiceSearch('');
    setShowResourceGroupDropdown(false);
    setShowAppServiceDropdown(false);
    setValue('resourceGroup', '');
    setValue('appService', '');
    setAppServices([]);
  };

  const handleResourceGroupSearch = (value: string) => {
    console.log('🔍 Searching for:', value);
    setResourceGroupSearch(value);

    // Filter based on the new value
    const filtered = resourceGroups.filter(rg =>
      rg.name.toLowerCase().includes(value.toLowerCase())
    );

    console.log('📊 Search results:', {
      searchTerm: value,
      totalResourceGroups: resourceGroups.length,
      filteredCount: filtered.length,
      sampleResults: filtered.slice(0, 5).map(rg => rg.name),
    });

    // Show dropdown if there's a search term and results
    setShowResourceGroupDropdown(value.length > 0 && filtered.length > 0);
    setValue('resourceGroup', value);
  };

  const selectResourceGroup = (resourceGroup: { id: string; name: string }) => {
    setSelectedResourceGroup(resourceGroup.name);
    setResourceGroupSearch(''); // Clear search to show selected indicator
    setShowResourceGroupDropdown(false);
    setValue('resourceGroup', resourceGroup.name);

    // Clear dependent fields when resource group changes
    setAppServiceSearch('');
    setShowAppServiceDropdown(false);
    setValue('appService', '');
    setAppServices([]);
  };

  const handleAppServiceSearch = (value: string) => {
    console.log('🔍 Searching app services for:', value);
    setAppServiceSearch(value);

    // Filter based on the new value
    const filtered = appServices.filter(
      app =>
        app.name.toLowerCase().includes(value.toLowerCase()) ||
        app.resourceGroup.toLowerCase().includes(value.toLowerCase())
    );

    console.log('📊 App service search results:', {
      searchTerm: value,
      totalAppServices: appServices.length,
      filteredCount: filtered.length,
      sampleResults: filtered.slice(0, 5).map(app => app.name),
    });

    // Show dropdown if there's a search term and results, or show preview if no search term
    setShowAppServiceDropdown(
      (value.length > 0 && filtered.length > 0) ||
        (value.length === 0 && appServices.length > 0)
    );
    setValue('appService', value);
  };

  const selectAppService = (appService: {
    id: string;
    name: string;
    resourceGroup: string;
  }) => {
    setAppServiceSearch(''); // Clear search to show selected indicator
    setShowAppServiceDropdown(false);
    setValue('appService', appService.name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            ⚙️ Direct Configuration
          </h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Datadog APM Configuration
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Configure Datadog APM directly on your Azure App Service using Azure
            REST APIs. This method gives you more control over the configuration
            process.
          </p>
        </div>

        {/* Azure CLI Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            📋 Get Azure Access Token
          </h3>
          <p className="text-gray-700 mb-3">
            First, obtain an access token using the Azure CLI:
          </p>
          <p className="text-gray-600 text-sm mt-3 text-center">
            Copy the access token from the command output and paste it in the
            form below.
          </p>
        </div>

        {/* API Error Alert */}
        {apiError && (
          <div className="mb-8">
            <ErrorAlert message={apiError} />
          </div>
        )}

        {/* Debug Info Panel */}
        {debugInfo && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-semibold text-yellow-800">
                🔍 Debug Info
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const savedToken =
                      sessionStorage.getItem('azure-access-token');
                    const tokenInfo = {
                      hasToken: !!watchAccessToken,
                      tokenLength: watchAccessToken?.length || 0,
                      hasSavedToken: !!savedToken,
                      savedTokenLength: savedToken?.length || 0,
                      tokensMatch: watchAccessToken === savedToken,
                    };
                    setDebugInfo(
                      `Token Status: ${JSON.stringify(tokenInfo, null, 2)}`
                    );
                  }}
                  className="text-yellow-600 hover:text-yellow-800 text-sm"
                >
                  🔑 Token Status
                </button>
                <button
                  onClick={async () => {
                    if (watchAccessToken && watchSubscription) {
                      try {
                        const response = await fetch(
                          `https://management.azure.com/subscriptions/${watchSubscription}/resourcegroups?api-version=2021-04-01`,
                          {
                            headers: {
                              Authorization: `Bearer ${watchAccessToken}`,
                              'Content-Type': 'application/json',
                            },
                          }
                        );
                        const data = await response.json();
                        console.log('Direct API call response:', data);
                        setDebugInfo(
                          `Direct API: Found ${data.value?.length || 0} resource groups. Status: ${response.status}`
                        );
                      } catch (error) {
                        console.error('Direct API call failed:', error);
                        setDebugInfo(
                          `Direct API failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                        );
                      }
                    }
                  }}
                  className="text-yellow-600 hover:text-yellow-800 text-sm"
                >
                  🔧 Test Direct API
                </button>
                <button
                  onClick={() => setDebugInfo('')}
                  className="text-yellow-600 hover:text-yellow-800 text-sm"
                >
                  ✕ Clear
                </button>
              </div>
            </div>
            <p className="text-yellow-700 text-sm font-mono whitespace-pre-wrap">
              {debugInfo}
            </p>
          </div>
        )}

        {/* Configuration Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Access Token Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Azure Access Token *
                </label>
                <div className="flex space-x-2">
                  {watchAccessToken && (
                    <span className="text-xs text-green-600">
                      ✓ Saved in session
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      sessionStorage.removeItem('azure-access-token');
                      setValue('accessToken', '');
                      setDebugInfo('Token cleared from session storage');
                    }}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Clear Token
                  </button>
                </div>
              </div>

              {/* Show token input if no token or if editing */}
              {!watchAccessToken ? (
                <>
                  <textarea
                    {...register('accessToken')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Paste your Azure access token here (will be saved for this session)..."
                    disabled={isConfiguring}
                  />
                  <div className="mt-3">
                    <div className="bg-gray-900 text-green-400 rounded-lg font-mono text-sm relative">
                      <div className="flex items-center justify-between p-4 pb-2">
                        <div className="flex items-center">
                          <div className="flex space-x-2 mr-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </div>
                          <span className="text-gray-400 text-xs">
                            Terminal
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const commands = `# Login to Azure
az login

# Get access token for Azure Resource Manager
az account get-access-token --resource https://management.azure.com/ --query accessToken --output tsv`;
                            navigator.clipboard.writeText(commands);
                            setDebugInfo('Commands copied to clipboard! 📋');
                          }}
                          className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                        >
                          📋 Copy
                        </button>
                      </div>
                      <div className="px-4 pb-4 space-y-2">
                        <div className="flex">
                          <span className="text-blue-400 mr-2">$</span>
                          <span className="text-gray-300">
                            # Login to Azure
                          </span>
                        </div>
                        <div className="flex">
                          <span className="text-blue-400 mr-2">$</span>
                          <span>az login</span>
                        </div>
                        <div className="flex">
                          <span className="text-blue-400 mr-2">$</span>
                          <span className="text-gray-300">
                            # Get access token for Azure Resource Manager
                          </span>
                        </div>
                        <div className="flex">
                          <span className="text-blue-400 mr-2">$</span>
                          <span className="break-all">
                            az account get-access-token --resource
                            https://management.azure.com/ --query accessToken
                            --output tsv
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Show masked token when present */
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm flex items-center justify-between">
                  <span className="text-gray-600">
                    🔒 Token:{' '}
                    {'•'.repeat(Math.min(watchAccessToken.length, 50))} (
                    {watchAccessToken.length} chars)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newToken = prompt(
                        'Enter new Azure access token:',
                        ''
                      );
                      if (newToken && newToken.trim()) {
                        setValue('accessToken', newToken.trim());
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 ml-2"
                  >
                    Edit
                  </button>
                </div>
              )}

              {errors.accessToken && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.accessToken.message}
                </p>
              )}
            </div>

            {/* Azure Resources Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription *
                  <span className="text-gray-500 text-xs ml-1">
                    ({subscriptions?.length || 0} total)
                  </span>
                </label>
                <input
                  type="text"
                  value={subscriptionSearch}
                  onChange={e => handleSubscriptionSearch(e.target.value)}
                  onFocus={() => {
                    // Show dropdown if there's a search term and results exist, or show preview if no search term
                    if (subscriptionSearch.length > 0) {
                      const hasResults =
                        subscriptions.filter(
                          sub =>
                            sub.displayName
                              .toLowerCase()
                              .includes(subscriptionSearch.toLowerCase()) ||
                            sub.subscriptionId
                              .toLowerCase()
                              .includes(subscriptionSearch.toLowerCase())
                        ).length > 0;
                      setShowSubscriptionDropdown(hasResults);
                    } else if (subscriptions.length > 0) {
                      // Show preview when focused but no search term
                      setShowSubscriptionDropdown(true);
                    }
                  }}
                  onBlur={() =>
                    setTimeout(() => setShowSubscriptionDropdown(false), 200)
                  } // Delay to allow clicking dropdown items
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={
                    loadingSubscriptions
                      ? 'Loading subscriptions...'
                      : !subscriptions.length
                        ? 'No subscriptions found...'
                        : `Type to search ${subscriptions.length} subscriptions...`
                  }
                  disabled={isConfiguring || loadingSubscriptions}
                />

                {/* Hidden input for form validation */}
                <input type="hidden" {...register('subscription')} />

                {/* Searchable Dropdown */}
                {showSubscriptionDropdown && subscriptionSearch.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredSubscriptions.length > 0 ? (
                      <>
                        <div className="px-3 py-2 text-xs text-gray-500 border-b bg-gray-50">
                          Showing {Math.min(filteredSubscriptions.length, 50)}{' '}
                          of {filteredSubscriptions.length} matches
                        </div>
                        {filteredSubscriptions.slice(0, 50).map(sub => (
                          <button
                            key={sub.subscriptionId}
                            type="button"
                            onClick={() => selectSubscription(sub)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm"
                          >
                            <div className="font-medium">{sub.displayName}</div>
                            <div className="text-xs text-gray-500 font-mono">
                              {sub.subscriptionId}
                            </div>
                          </button>
                        ))}
                        {filteredSubscriptions.length > 50 && (
                          <div className="px-3 py-2 text-xs text-gray-500 border-t bg-gray-50">
                            ... and {filteredSubscriptions.length - 50} more.
                            Keep typing to narrow down.
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="px-3 py-2 text-sm text-gray-500 border-b bg-gray-50">
                          No subscriptions found matching "{subscriptionSearch}"
                        </div>
                        {subscriptions.length > 0 && (
                          <>
                            <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
                              Available subscriptions (click to select):
                            </div>
                            {subscriptions.slice(0, 5).map(sub => (
                              <button
                                key={sub.subscriptionId}
                                type="button"
                                onClick={() => selectSubscription(sub)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm"
                              >
                                <div className="font-medium">
                                  {sub.displayName}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                  {sub.subscriptionId}
                                </div>
                              </button>
                            ))}
                            {subscriptions.length > 5 && (
                              <div className="px-3 py-2 text-xs text-gray-500 border-t bg-gray-50">
                                ... and {subscriptions.length - 5} more. Start
                                typing to search.
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Preview Dropdown - Show when focused but no search term */}
                {showSubscriptionDropdown &&
                  subscriptionSearch.length === 0 &&
                  subscriptions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div className="px-3 py-2 text-xs text-gray-500 border-b bg-gray-50">
                        Available subscriptions (click to select):
                      </div>
                      {subscriptions.slice(0, 5).map(sub => (
                        <button
                          key={sub.subscriptionId}
                          type="button"
                          onClick={() => selectSubscription(sub)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm"
                        >
                          <div className="font-medium">{sub.displayName}</div>
                          <div className="text-xs text-gray-500 font-mono">
                            {sub.subscriptionId}
                          </div>
                        </button>
                      ))}
                      {subscriptions.length > 5 && (
                        <div className="px-3 py-2 text-xs text-gray-500 border-t bg-gray-50">
                          ... and {subscriptions.length - 5} more. Start typing
                          to search.
                        </div>
                      )}
                    </div>
                  )}

                {/* Show selected subscription below the input */}
                {!subscriptionSearch && selectedSubscription && (
                  <div className="mt-2 p-2 border border-black rounded-md bg-green-50">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-700 text-sm font-medium">
                        ✓ Selected:
                      </span>
                      <span className="text-green-800 text-sm">
                        {subscriptions.find(
                          sub => sub.subscriptionId === selectedSubscription
                        )?.displayName || selectedSubscription}
                      </span>
                      <span className="text-green-600 text-xs font-mono">
                        ({selectedSubscription})
                      </span>
                    </div>
                  </div>
                )}

                {errors.subscription && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.subscription.message}
                  </p>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resource Group *
                  <span className="text-gray-500 text-xs ml-1">
                    ({resourceGroups?.length || 0} total)
                  </span>
                </label>
                <input
                  type="text"
                  value={resourceGroupSearch}
                  onChange={e => handleResourceGroupSearch(e.target.value)}
                  onFocus={() => {
                    // Show dropdown if there's a search term and results exist
                    if (resourceGroupSearch.length > 0) {
                      const hasResults =
                        resourceGroups.filter(rg =>
                          rg.name
                            .toLowerCase()
                            .includes(resourceGroupSearch.toLowerCase())
                        ).length > 0;
                      setShowResourceGroupDropdown(hasResults);
                    }
                  }}
                  onBlur={() =>
                    setTimeout(() => setShowResourceGroupDropdown(false), 200)
                  } // Delay to allow clicking dropdown items
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={
                    loadingResourceGroups
                      ? 'Loading resource groups...'
                      : !selectedSubscription
                        ? 'Select subscription first...'
                        : !resourceGroups.length
                          ? 'No resource groups found...'
                          : `Type to search ${resourceGroups.length} resource groups...`
                  }
                  disabled={
                    isConfiguring ||
                    loadingResourceGroups ||
                    !selectedSubscription
                  }
                />

                {/* Hidden input for form validation */}
                <input type="hidden" {...register('resourceGroup')} />

                {/* Searchable Dropdown */}
                {showResourceGroupDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredResourceGroups.length > 0 ? (
                      <>
                        <div className="px-3 py-2 text-xs text-gray-500 border-b bg-gray-50">
                          Showing {Math.min(filteredResourceGroups.length, 50)}{' '}
                          of {filteredResourceGroups.length} matches
                        </div>
                        {filteredResourceGroups.slice(0, 50).map(rg => (
                          <button
                            key={rg.name}
                            type="button"
                            onClick={() => selectResourceGroup(rg)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm"
                          >
                            {rg.name}
                          </button>
                        ))}
                        {filteredResourceGroups.length > 50 && (
                          <div className="px-3 py-2 text-xs text-gray-500 border-t bg-gray-50">
                            ... and {filteredResourceGroups.length - 50} more.
                            Keep typing to narrow down.
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No resource groups found matching "{resourceGroupSearch}
                        "
                      </div>
                    )}
                  </div>
                )}

                {/* Show selected resource group below the input */}
                {!resourceGroupSearch && selectedResourceGroup && (
                  <div className="mt-2 p-2 border border-black rounded-md bg-green-50">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-700 text-sm font-medium">
                        ✓ Selected:
                      </span>
                      <span className="text-green-800 text-sm font-mono">
                        {selectedResourceGroup}
                      </span>
                    </div>
                  </div>
                )}

                {errors.resourceGroup && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.resourceGroup.message}
                  </p>
                )}
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Service *
                <span className="text-gray-500 text-xs ml-1">
                  ({appServices?.length || 0} total)
                </span>
              </label>
              <input
                type="text"
                value={appServiceSearch}
                onChange={e => handleAppServiceSearch(e.target.value)}
                onFocus={() => {
                  // Show dropdown if there's a search term and results exist, or show preview if no search term
                  if (appServiceSearch.length > 0) {
                    const hasResults =
                      appServices.filter(
                        app =>
                          app.name
                            .toLowerCase()
                            .includes(appServiceSearch.toLowerCase()) ||
                          app.resourceGroup
                            .toLowerCase()
                            .includes(appServiceSearch.toLowerCase())
                      ).length > 0;
                    setShowAppServiceDropdown(hasResults);
                  } else if (appServices.length > 0) {
                    // Show preview when focused but no search term
                    setShowAppServiceDropdown(true);
                  }
                }}
                onBlur={() =>
                  setTimeout(() => setShowAppServiceDropdown(false), 200)
                } // Delay to allow clicking dropdown items
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={
                  loadingAppServices
                    ? 'Loading app services...'
                    : !selectedResourceGroup
                      ? 'Select resource group first...'
                      : !appServices.length
                        ? 'No app services found...'
                        : `Type to search ${appServices.length} app services...`
                }
                disabled={
                  isConfiguring || loadingAppServices || !selectedResourceGroup
                }
              />

              {/* Hidden input for form validation */}
              <input type="hidden" {...register('appService')} />

              {/* Searchable Dropdown */}
              {showAppServiceDropdown && appServiceSearch.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredAppServices.length > 0 ? (
                    <>
                      <div className="px-3 py-2 text-xs text-gray-500 border-b bg-gray-50">
                        Showing {Math.min(filteredAppServices.length, 50)} of{' '}
                        {filteredAppServices.length} matches
                      </div>
                      {filteredAppServices.slice(0, 50).map(app => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => selectAppService(app)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm"
                        >
                          <div className="font-medium">{app.name}</div>
                          <div className="text-xs text-gray-500">
                            Resource Group: {app.resourceGroup}
                          </div>
                        </button>
                      ))}
                      {filteredAppServices.length > 50 && (
                        <div className="px-3 py-2 text-xs text-gray-500 border-t bg-gray-50">
                          ... and {filteredAppServices.length - 50} more. Keep
                          typing to narrow down.
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="px-3 py-2 text-sm text-gray-500 border-b bg-gray-50">
                        No app services found matching "{appServiceSearch}"
                      </div>
                      {appServices.length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
                            Available app services (click to select):
                          </div>
                          {appServices.slice(0, 5).map(app => (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => selectAppService(app)}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm"
                            >
                              <div className="font-medium">{app.name}</div>
                              <div className="text-xs text-gray-500">
                                Resource Group: {app.resourceGroup}
                              </div>
                            </button>
                          ))}
                          {appServices.length > 5 && (
                            <div className="px-3 py-2 text-xs text-gray-500 border-t bg-gray-50">
                              ... and {appServices.length - 5} more. Start
                              typing to search.
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Preview Dropdown - Show when focused but no search term */}
              {showAppServiceDropdown &&
                appServiceSearch.length === 0 &&
                appServices.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    <div className="px-3 py-2 text-xs text-gray-500 border-b bg-gray-50">
                      Available app services (click to select):
                    </div>
                    {appServices.slice(0, 5).map(app => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => selectAppService(app)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm"
                      >
                        <div className="font-medium">{app.name}</div>
                        <div className="text-xs text-gray-500">
                          Resource Group: {app.resourceGroup}
                        </div>
                      </button>
                    ))}
                    {appServices.length > 5 && (
                      <div className="px-3 py-2 text-xs text-gray-500 border-t bg-gray-50">
                        ... and {appServices.length - 5} more. Start typing to
                        search.
                      </div>
                    )}
                  </div>
                )}

              {/* Show selected app service below the input */}
              {!appServiceSearch && watchAppService && (
                <div className="mt-2 p-2 border border-black rounded-md bg-green-50">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-700 text-sm font-medium">
                      ✓ Selected:
                    </span>
                    <span className="text-green-800 text-sm font-mono">
                      {watchAppService}
                    </span>
                  </div>
                </div>
              )}

              {errors.appService && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.appService.message}
                </p>
              )}
            </div>

            {/* Fetch Current Settings Section */}
            {watchResourceGroup && (
              <div className="border-t pt-6">
                <div className="border-t border-b border-gray-300 py-6 my-6 bg-gray-50">
                  <div className="w-full flex justify-center items-center">
                    <button
                      type="button"
                      onClick={fetchCurrentSettings}
                      disabled={
                        loadingCurrentSettings ||
                        !watchAccessToken ||
                        !watchSubscription ||
                        !watchResourceGroup ||
                        !watchAppService
                      }
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {loadingCurrentSettings ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Fetching...</span>
                        </>
                      ) : !watchAppService ? (
                        <>
                          <span>🔍</span>
                          <span>Select App Service to Fetch Settings</span>
                        </>
                      ) : (
                        <>
                          <span>🔍</span>
                          <span>Fetch Current Settings</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-center text-sm text-gray-600 mt-3">
                    Fetch existing configuration before making changes
                  </p>
                </div>
              </div>
            )}

            {/* Current Settings Display */}
            {currentSettings && !isCurrentSettingsCollapsed && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 mb-8">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    📋 Current App Settings for{' '}
                    <a
                      href={getAzurePortalUrl(
                        watchSubscription,
                        watchResourceGroup,
                        watchAppService
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-3 py-1 bg-blue-50 border-2 border-blue-200 rounded-full text-blue-800 font-mono text-sm hover:bg-blue-100 hover:border-blue-300 transition-colors cursor-pointer"
                      title="Open in Azure Portal"
                    >
                      {watchAppService} 🔗
                    </a>
                  </h3>
                  <div className="text-sm text-gray-600 mt-1">
                    {Object.keys(currentSettings).length} total settings
                  </div>
                  {(appServiceType || appServiceLanguage || appServicePlan) && (
                    <div className="flex items-center justify-center space-x-4 mt-3">
                      {appServiceType && (
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">
                            Type:
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              appServiceType === 'Windows'
                                ? 'bg-blue-100 text-blue-800'
                                : appServiceType === 'Linux'
                                  ? 'bg-green-100 text-green-800'
                                  : appServiceType === 'Container'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {appServiceType === 'Windows' && '🪟'}
                            {appServiceType === 'Linux' && '🐧'}
                            {appServiceType === 'Container' && '📦'}
                            <span className="ml-1">{appServiceType}</span>
                          </span>
                        </div>
                      )}
                      {appServiceLanguage && (
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">
                            Runtime:
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <span className="mr-1">⚙️</span>
                            <span>
                              {appServiceLanguage.language}{' '}
                              {appServiceLanguage.version}
                            </span>
                          </span>
                        </div>
                      )}
                      {appServicePlan && (
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">
                            App Service Plan:
                          </span>
                          <a
                            href={getAppServicePlanUrl(
                              watchSubscription,
                              watchResourceGroup,
                              appServicePlan.name
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border-2 border-indigo-200 hover:bg-indigo-200 hover:border-indigo-300 transition-colors cursor-pointer"
                            title="Open App Service Plan in Azure Portal"
                          >
                            <span className="mr-1">📋</span>
                            <span>{appServicePlan.name}</span>
                            {appServicePlan.properties?.sku && (
                              <span className="ml-1 text-xs opacity-75">
                                ({appServicePlan.properties.sku.tier}{' '}
                                {appServicePlan.properties.sku.size})
                              </span>
                            )}
                            <span className="ml-1">🔗</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="max-w-4xl mx-auto">
                  {/* Datadog Settings Section */}
                  {(() => {
                    const datadogSettings = Object.entries(
                      currentSettings
                    ).filter(
                      ([key]) =>
                        key.toLowerCase().includes('datadog') ||
                        key.toLowerCase().includes('dd_') ||
                        key === 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
                    );

                    if (datadogSettings.length > 0) {
                      return (
                        <div className="mb-4">
                          <h4 className="text-md font-medium text-green-700 mb-2">
                            🐕 Datadog Settings ({datadogSettings.length})
                          </h4>
                          <div className="bg-green-50 rounded-md p-3 max-h-60 overflow-y-auto space-y-3">
                            {datadogSettings.map(([key, value]) => (
                              <div
                                key={key}
                                className="border-b border-green-200 pb-2 last:border-b-0"
                              >
                                <span className="font-mono text-sm text-green-800 font-medium block mb-1">
                                  {key}:
                                </span>
                                <span className="font-mono text-green-600 break-all text-xs bg-green-100 p-2 rounded block">
                                  {redactSensitiveValue(key, String(value))}
                                  {isSensitiveKey(key) && (
                                    <span
                                      className="ml-2 text-xs text-green-500"
                                      title="Sensitive value - visually redacted but available for copying"
                                    >
                                      🔒
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                            {datadogSettings.some(([key]) =>
                              isSensitiveKey(key)
                            ) && (
                              <div className="text-xs text-green-600 bg-green-100 p-2 rounded mt-2">
                                ℹ️ Sensitive values (🔒) are visually redacted
                                for security but remain available for copying to
                                new configurations.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-yellow-800 text-sm">
                          ℹ️ No existing Datadog settings found
                        </p>
                      </div>
                    );
                  })()}

                  {/* Datadog Setup Configuration Section */}
                  {datadogConfiguration && (
                    <div className="mb-4">
                      {datadogConfiguration.setupType === 'sidecar' && (
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                          <h4 className="text-md font-medium text-purple-700 mb-2">
                            📦 Datadog Sidecar Container (Linux)
                          </h4>
                          <div className="space-y-3 text-sm">
                            {datadogConfiguration.details?.containerName && (
                              <div>
                                <span className="text-purple-700 font-medium block mb-1">
                                  Container Name:
                                </span>
                                <span className="font-mono text-purple-600 break-all text-xs bg-purple-100 p-2 rounded block">
                                  {datadogConfiguration.details.containerName}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-purple-700 font-medium block mb-1">
                                Container Image:
                              </span>
                              <span className="font-mono text-purple-600 break-all text-xs bg-purple-100 p-2 rounded block">
                                {datadogConfiguration.details?.containerImage ||
                                  'Not set'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-purple-700 font-medium">
                                Port:
                              </span>
                              <span className="font-mono text-purple-600">
                                {datadogConfiguration.details?.port ||
                                  'Not set'}
                              </span>
                            </div>
                            {datadogConfiguration.details?.status && (
                              <div className="flex justify-between items-center">
                                <span className="text-purple-700 font-medium">
                                  Status:
                                </span>
                                <div className="flex items-center gap-2">
                                  {isLoadingContainerStatus && (
                                    <div className="w-4 h-4">
                                      <LoadingSpinner />
                                    </div>
                                  )}
                                  <span className="font-mono text-purple-600">
                                    {datadogConfiguration.details?.status}
                                  </span>
                                  <button
                                    onClick={async () => {
                                      if (
                                        datadogConfiguration.details
                                          ?.containerName &&
                                        watchAccessToken &&
                                        watchSubscription &&
                                        watchResourceGroup &&
                                        watchAppService
                                      ) {
                                        setIsLoadingContainerStatus(true);
                                        const azureService = new AzureService(
                                          watchAccessToken
                                        );
                                        try {
                                          console.log(
                                            '🔄 Manual status refresh triggered'
                                          );
                                          const status =
                                            await azureService.getSiteContainerStatus(
                                              watchSubscription,
                                              watchResourceGroup,
                                              watchAppService,
                                              datadogConfiguration.details
                                                .containerName
                                            );

                                          if (status) {
                                            const extractedStatus =
                                              status.status ||
                                              status.state ||
                                              status.properties?.status ||
                                              'Running';
                                            setDatadogConfiguration(prev =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    details: {
                                                      ...prev.details,
                                                      status: extractedStatus,
                                                      statusDetails: status,
                                                      lastUpdated:
                                                        new Date().toISOString(),
                                                    },
                                                  }
                                                : prev
                                            );
                                          }
                                        } catch (error) {
                                          console.error(
                                            'Manual status refresh failed:',
                                            error
                                          );
                                        } finally {
                                          setIsLoadingContainerStatus(false);
                                        }
                                      }
                                    }}
                                    className="text-purple-600 hover:text-purple-800 text-xs p-1"
                                    disabled={isLoadingContainerStatus}
                                    title="Refresh status"
                                  >
                                    🔄
                                  </button>
                                </div>
                              </div>
                            )}
                            {datadogConfiguration.details?.createdTime && (
                              <div className="flex justify-between">
                                <span className="text-purple-700 font-medium">
                                  Deployed:
                                </span>
                                <span className="font-mono text-purple-600 text-xs">
                                  {new Date(
                                    datadogConfiguration.details.createdTime
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {datadogConfiguration.details?.lastUpdated && (
                              <div className="flex justify-between">
                                <span className="text-purple-700 font-medium">
                                  Last Checked:
                                </span>
                                <span className="font-mono text-purple-600 text-xs">
                                  {new Date(
                                    datadogConfiguration.details.lastUpdated
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {datadogConfiguration.details?.statusDetails && (
                              <div className="mt-2 pt-2 border-t border-purple-200">
                                <button
                                  onClick={() =>
                                    setShowStatusDetails(!showStatusDetails)
                                  }
                                  className="flex items-center gap-2 text-purple-700 font-medium text-xs hover:text-purple-800 transition-colors"
                                >
                                  <span>{showStatusDetails ? '▼' : '▶'}</span>
                                  <span>Status Details</span>
                                  <span className="text-purple-500">
                                    (
                                    {
                                      Object.keys(
                                        datadogConfiguration.details
                                          .statusDetails
                                      ).length
                                    }{' '}
                                    properties)
                                  </span>
                                </button>
                                {showStatusDetails && (
                                  <div className="mt-2">
                                    <div
                                      className="bg-purple-100 p-3 rounded max-h-60 overflow-y-auto border border-purple-200"
                                      dangerouslySetInnerHTML={{
                                        __html: formatContainerStatusDetails(
                                          datadogConfiguration.details
                                            .statusDetails
                                        ),
                                      }}
                                    />
                                  </div>
                                )}
                                <div className="mt-2 pt-2 border-t border-purple-200">
                                  <button
                                    onClick={() =>
                                      setShowFullJson(!showFullJson)
                                    }
                                    className="flex items-center gap-2 text-purple-700 font-medium text-xs hover:text-purple-800 transition-colors"
                                  >
                                    <span>{showFullJson ? '▼' : '▶'}</span>
                                    <span>Full Container JSON</span>
                                    <span className="text-purple-500">
                                      (Raw API response)
                                    </span>
                                  </button>
                                  {showFullJson && (
                                    <div className="mt-2">
                                      <div className="bg-purple-100 p-3 rounded max-h-96 overflow-y-auto border border-purple-200 text-left">
                                        <SyntaxHighlighter
                                          language="json"
                                          style={githubGist}
                                          customStyle={{
                                            backgroundColor: 'transparent',
                                            fontSize: '12px',
                                            margin: 0,
                                            padding: 0,
                                            color: '#6b21a8', // purple-800
                                          }}
                                          showLineNumbers={false}
                                        >
                                          {JSON.stringify(
                                            datadogConfiguration.details
                                              .statusDetails,
                                            null,
                                            2
                                          )}
                                        </SyntaxHighlighter>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-purple-600 text-xs mt-2">
                            ✅ Datadog sidecar container is configured
                          </p>
                        </div>
                      )}

                      {datadogConfiguration.setupType === 'extension' && (
                        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-md">
                          <h4 className="text-md font-medium text-indigo-700 mb-2">
                            🔌 Datadog Extension (Windows)
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="text-indigo-700 font-medium block mb-1">
                                Extension:
                              </span>
                              <span className="font-mono text-indigo-600 break-all text-xs bg-indigo-100 p-2 rounded block">
                                {datadogConfiguration.details?.title}
                              </span>
                            </div>
                            <div>
                              <span className="text-indigo-700 font-medium block mb-1">
                                Extension ID:
                              </span>
                              <span className="font-mono text-indigo-600 break-all text-xs bg-indigo-100 p-2 rounded block">
                                {datadogConfiguration.details?.extensionId}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-indigo-700 font-medium">
                                Version:
                              </span>
                              <span className="font-mono text-indigo-600">
                                {datadogConfiguration.details?.version}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-indigo-700 font-medium">
                                State:
                              </span>
                              <span className="font-mono text-indigo-600">
                                {datadogConfiguration.details?.state}
                              </span>
                            </div>
                          </div>
                          <p className="text-indigo-600 text-xs mt-2">
                            ✅ Datadog extension is installed
                          </p>
                        </div>
                      )}

                      {datadogConfiguration.setupType === 'none' &&
                        appServiceType && (
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                            <h4 className="text-md font-medium text-gray-700 mb-2">
                              ⚙️ Datadog Setup Status
                            </h4>
                            <div className="space-y-2 text-sm">
                              {appServiceType === 'Linux' && (
                                <p className="text-gray-600">
                                  💡 No Datadog sidecar container detected. To
                                  configure:
                                </p>
                              )}
                              {appServiceType === 'Windows' && (
                                <p className="text-gray-600">
                                  💡 No Datadog extension detected. To
                                  configure:
                                </p>
                              )}
                              <ul className="text-gray-600 text-xs ml-4 space-y-1">
                                {appServiceType === 'Linux' && (
                                  <>
                                    <li>
                                      • Navigate to Deployment → Deployment
                                      Center → Containers
                                    </li>
                                    <li>
                                      • Add custom container:{' '}
                                      <span className="font-mono">
                                        datadog/serverless-init:latest
                                      </span>
                                    </li>
                                    <li>
                                      • Set port to{' '}
                                      <span className="font-mono">8126</span>
                                    </li>
                                  </>
                                )}
                                {appServiceType === 'Windows' && (
                                  <>
                                    <li>• Go to Azure Extensions page</li>
                                    <li>
                                      • Install ".NET Datadog APM" extension
                                    </li>
                                    <li>
                                      • App must be stopped during installation
                                    </li>
                                  </>
                                )}
                              </ul>
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                  {/* .NET Specific Settings Section */}
                  {isDotNetRuntime() &&
                    (() => {
                      const dotnetSettings = Object.entries(
                        currentSettings
                      ).filter(([key]) =>
                        DOTNET_SPECIFIC_SETTINGS.includes(key)
                      );

                      if (dotnetSettings.length > 0) {
                        return (
                          <div className="mb-4">
                            <h4 className="text-md font-medium text-blue-700 mb-2">
                              🔧 .NET Datadog Settings ({dotnetSettings.length})
                            </h4>
                            <div className="bg-blue-50 rounded-md p-3 max-h-60 overflow-y-auto space-y-3">
                              {dotnetSettings.map(([key, value]) => (
                                <div
                                  key={key}
                                  className="border-b border-blue-200 pb-2 last:border-b-0"
                                >
                                  <span className="font-mono text-sm text-blue-800 font-medium block mb-1">
                                    {key}:
                                  </span>
                                  <span className="font-mono text-blue-600 break-all text-xs bg-blue-100 p-2 rounded block">
                                    {redactSensitiveValue(key, String(value))}
                                    {isSensitiveKey(key) && (
                                      <span className="ml-2 text-xs text-blue-500">
                                        🔒
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-blue-800 text-sm">
                              💡 No .NET-specific Datadog settings found. These
                              would be configured automatically:
                            </p>
                            <ul className="text-blue-700 text-xs mt-2 space-y-1">
                              <li>
                                •{' '}
                                <span className="font-mono">
                                  DD_DOTNET_TRACER_HOME
                                </span>
                                : /home/site/wwwroot/datadog
                              </li>
                              <li>
                                •{' '}
                                <span className="font-mono">
                                  DD_TRACE_LOG_DIRECTORY
                                </span>
                                : /home/LogFiles/dotnet
                              </li>
                              <li>
                                •{' '}
                                <span className="font-mono">
                                  CORECLR_ENABLE_PROFILING
                                </span>
                                : 1
                              </li>
                              <li>
                                •{' '}
                                <span className="font-mono">
                                  CORECLR_PROFILER
                                </span>
                                : {'{846F5F1C-F9AE-4B07-969E-05C26BC060D8}'}
                              </li>
                              <li>
                                •{' '}
                                <span className="font-mono">
                                  CORECLR_PROFILER_PATH
                                </span>
                                :
                                /home/site/wwwroot/datadog/linux-x64/Datadog.Trace.ClrProfiler.Native.so
                              </li>
                            </ul>
                          </div>
                        );
                      }
                    })()}

                  {/* All Settings */}
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center">
                      <span className="transform group-open:rotate-90 transition-transform mr-2">
                        ▶
                      </span>
                      View All Settings ({Object.keys(currentSettings).length})
                    </summary>
                    <div className="mt-3 bg-white rounded-md p-4 max-h-60 overflow-y-auto">
                      <div className="space-y-3">
                        {Object.entries(currentSettings).map(([key, value]) => (
                          <div
                            key={key}
                            className="border-b border-gray-100 pb-2 last:border-b-0"
                          >
                            <span className="font-mono text-xs text-gray-700 font-medium block mb-1">
                              {key}:
                            </span>
                            <span className="font-mono text-gray-600 break-all text-xs bg-gray-50 p-2 rounded block">
                              {redactSensitiveValue(key, String(value))}
                              {isSensitiveKey(key) && (
                                <span className="ml-2 text-xs text-gray-400">
                                  🔒
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>

                  {/* Pre-fill Form Button Section */}
                  {(() => {
                    const datadogSettings = Object.entries(
                      currentSettings
                    ).filter(
                      ([key]) =>
                        key.toLowerCase().includes('datadog') ||
                        key.toLowerCase().includes('dd_') ||
                        key === 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
                    );

                    if (datadogSettings.length > 0) {
                      return (
                        <div className="mb-4">
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                prefillFromCurrentSettings();
                                // Scroll to the Datadog Configuration section
                                setTimeout(() => {
                                  const configElement = document.getElementById(
                                    'datadog-configuration-section'
                                  );
                                  if (configElement) {
                                    configElement.scrollIntoView({
                                      behavior: 'smooth',
                                      block: 'start',
                                    });
                                  }
                                }, 100);
                              }}
                              title="Pre-fill the configuration form with current Datadog settings from this app service"
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-sm flex items-center space-x-2 transition-colors"
                            >
                              <span>📝</span>
                              <span>Pre-fill Form with Current Values</span>
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-green-600 text-center">
                            Click to copy current settings to the form below
                            (API key excluded for security)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <button
                    type="button"
                    onClick={() => setIsCurrentSettingsCollapsed(true)}
                    className="mt-4 text-sm text-gray-600 hover:text-gray-800"
                  >
                    ✕ Hide Current Settings
                  </button>
                </div>
              </div>
            )}

            {/* Show Current Settings Button (when collapsed) */}
            {currentSettings && isCurrentSettingsCollapsed && (
              <div className="mb-8">
                <button
                  type="button"
                  onClick={() => setIsCurrentSettingsCollapsed(false)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>✅</span>
                    <span className="text-sm font-medium text-gray-700">
                      Show Current Settings
                    </span>
                    <span className="text-xs text-gray-500">
                      ({Object.keys(currentSettings).length} settings)
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* Datadog Configuration Section */}
            <div
              id="datadog-configuration-section"
              className="bg-gray-50 border border-gray-200 rounded-lg p-8 mb-8"
            >
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  ⚙️ New Datadog Configuration for{' '}
                  <a
                    href={
                      watchAppService
                        ? getAzurePortalUrl(
                            watchSubscription,
                            watchResourceGroup,
                            watchAppService
                          )
                        : '#'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-block px-3 py-1 border-2 rounded-full font-mono text-sm transition-colors cursor-pointer ${watchAppService ? 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 hover:border-blue-300' : 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'}`}
                    title={
                      watchAppService
                        ? 'Open in Azure Portal'
                        : 'Select an App Service first'
                    }
                  >
                    {watchAppService || 'Selected App Service'}{' '}
                    {watchAppService && '🔗'}
                  </a>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Configure Datadog APM settings that will be applied to your
                  app service
                </p>
              </div>

              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Datadog API Key *
                      <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        DD_API_KEY
                      </span>
                    </label>
                    <input
                      type="password"
                      {...register('apiKey')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your Datadog API key"
                      disabled={isConfiguring}
                    />
                    {errors.apiKey && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.apiKey.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Datadog Site *
                      <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        DD_SITE
                      </span>
                    </label>
                    <select
                      {...register('datadogSite')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isConfiguring}
                    >
                      {DATADOG_SITES.map((site: DatadogSite) => (
                        <option key={site.value} value={site.value}>
                          {site.label}
                        </option>
                      ))}
                    </select>
                    {errors.datadogSite && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.datadogSite.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Name *
                      <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        DD_SERVICE
                      </span>
                    </label>
                    <input
                      type="text"
                      {...register('serviceName')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="my-app-service"
                      disabled={isConfiguring}
                    />
                    {errors.serviceName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.serviceName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Environment *
                      <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        DD_ENV
                      </span>
                    </label>
                    <input
                      type="text"
                      {...register('environment')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="production"
                      disabled={isConfiguring}
                    />
                    {errors.environment && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.environment.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Version (Optional)
                      <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        DD_VERSION
                      </span>
                    </label>
                    <input
                      type="text"
                      {...register('version')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1.0.0"
                      disabled={isConfiguring}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Log Path *
                      <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        DD_SERVERLESS_LOG_PATH
                      </span>
                    </label>
                    <input
                      type="text"
                      {...register('logPath')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="/home/LogFiles/*.log"
                      disabled={isConfiguring}
                    />
                    {errors.logPath && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.logPath.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enable App Service Storage *
                    <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      WEBSITES_ENABLE_APP_SERVICE_STORAGE
                    </span>
                  </label>
                  <select
                    {...register('enableAppServiceStorage')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isConfiguring}
                  >
                    <option value="true">true (Enabled - Recommended)</option>
                    <option value="false">false (Disabled)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-600">
                    Required for Datadog to access the file system for logs,
                    traces, and .NET profiler files. Recommended to keep enabled
                    for proper Datadog functionality.
                  </p>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('isDotNet')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={isConfiguring}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      This is a .NET application (includes additional
                      .NET-specific configuration)
                    </span>
                  </label>
                </div>
              </div>

              {/* .NET-specific configuration fields */}
              {watchIsDotNet && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="text-md font-medium text-blue-700 mb-4">
                    🔧 .NET Configuration
                  </h4>
                  <p className="text-sm text-blue-600 mb-4">
                    Additional .NET-specific settings for Datadog APM profiling
                    and tracing.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">
                        Datadog Tracer Home *
                        <span className="ml-2 font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                          DD_DOTNET_TRACER_HOME
                        </span>
                      </label>
                      <input
                        type="text"
                        {...register('dotnetTracerHome')}
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="/home/site/wwwroot/datadog"
                        disabled={isConfiguring}
                      />
                      <p className="mt-1 text-xs text-blue-600">
                        Path where Datadog .NET tracer files are installed
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">
                        Trace Log Directory *
                        <span className="ml-2 font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                          DD_TRACE_LOG_DIRECTORY
                        </span>
                      </label>
                      <input
                        type="text"
                        {...register('dotnetTraceLogDirectory')}
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="/home/LogFiles/dotnet"
                        disabled={isConfiguring}
                      />
                      <p className="mt-1 text-xs text-blue-600">
                        Directory for .NET trace log files
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">
                        CORECLR Enable Profiling *
                        <span className="ml-2 font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                          CORECLR_ENABLE_PROFILING
                        </span>
                      </label>
                      <select
                        {...register('coreclrEnableProfiling')}
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        disabled={isConfiguring}
                      >
                        <option value="1">1 (Enabled)</option>
                        <option value="0">0 (Disabled)</option>
                      </select>
                      <p className="mt-1 text-xs text-blue-600">
                        Enable or disable .NET Core profiling
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">
                        CORECLR Profiler GUID *
                        <span className="ml-2 font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                          CORECLR_PROFILER
                        </span>
                      </label>
                      <select
                        {...register('coreclrProfiler')}
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono text-sm"
                        disabled={isConfiguring}
                      >
                        <option value="">No Value (Disabled)</option>
                        <option value="{'846F5F1C-F9AE-4B07-969E-05C26BC060D8'}">
                          {'846F5F1C-F9AE-4B07-969E-05C26BC060D8'}
                        </option>
                      </select>
                      <p className="mt-1 text-xs text-blue-600">
                        GUID identifier for the Datadog .NET profiler
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-blue-700 mb-2">
                        CORECLR Profiler Path *
                        <span className="ml-2 font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                          CORECLR_PROFILER_PATH
                        </span>
                      </label>
                      <input
                        type="text"
                        {...register('coreclrProfilerPath')}
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono text-sm"
                        placeholder="/home/site/wwwroot/datadog/linux-x64/Datadog.Trace.ClrProfiler.Native.so"
                        disabled={isConfiguring}
                      />
                      <p className="mt-1 text-xs text-blue-600">
                        Full path to the Datadog .NET profiler native library
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-md">
                    <p className="text-xs text-blue-700">
                      <strong>Note:</strong> These settings configure the .NET
                      Core profiler for automatic instrumentation. The profiler
                      will inject tracing code into your .NET application at
                      runtime.
                    </p>
                  </div>
                </div>
              )}

              {/* Datadog Deployment Configuration Section */}
              <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-md">
                <h4 className="text-md font-medium text-purple-700 mb-4">
                  📦 Datadog Sidecar Container (Linux)
                </h4>

                {appServiceType === 'Linux' && (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-purple-700 mb-2">
                          Container Name
                        </label>
                        <input
                          type="text"
                          value="datadog-sidecar"
                          className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-100"
                          disabled={true}
                          readOnly
                        />
                        <p className="mt-1 text-xs text-purple-600">
                          Fixed container name
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-purple-700 mb-2">
                          Container Type
                        </label>
                        <input
                          type="text"
                          value="Sidecar"
                          className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-100"
                          disabled={true}
                          readOnly
                        />
                        <p className="mt-1 text-xs text-purple-600">
                          Fixed container type
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-purple-700 mb-2">
                          Registry Server URL
                        </label>
                        <input
                          type="text"
                          {...register('sidecarRegistryUrl')}
                          className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                          placeholder="index.docker.io"
                          disabled={isConfiguring}
                        />
                        <p className="mt-1 text-xs text-purple-600">
                          Docker registry server
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-purple-700 mb-2">
                          Image and Tag
                        </label>
                        <input
                          type="text"
                          {...register('sidecarImage')}
                          className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                          placeholder="datadog/serverless-init:latest"
                          disabled={isConfiguring}
                        />
                        <p className="mt-1 text-xs text-purple-600">
                          Docker image name and version
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-purple-700 mb-2">
                          Port
                        </label>
                        <input
                          type="text"
                          {...register('sidecarPort')}
                          className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                          placeholder="8126"
                          disabled={isConfiguring}
                        />
                        <p className="mt-1 text-xs text-purple-600">
                          Datadog trace agent port
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-purple-700 mb-2">
                          Startup Command
                        </label>
                        <input
                          type="text"
                          {...register('sidecarStartupCommand')}
                          className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                          placeholder="Optional startup command"
                          disabled={isConfiguring}
                        />
                        <p className="mt-1 text-xs text-purple-600">
                          Optional container startup command
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-purple-100 border border-purple-200 rounded-md">
                      <p className="text-xs text-purple-700">
                        <strong>Configuration:</strong> The sidecar container
                        will be configured with environment variable forwarding
                        (name=value pattern) and will automatically access all
                        app settings. Environment variables like DD_API_KEY,
                        DD_SITE, DD_APM_ENABLED, and
                        DD_DOGSTATSD_NON_LOCAL_TRAFFIC will be set in the main
                        app settings.
                      </p>
                    </div>
                  </div>
                )}

                {appServiceType === 'Windows' && (
                  <div>
                    <p className="text-sm text-purple-600 mb-4">
                      Configure the Datadog APM extension for Windows App
                      Service monitoring.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            {...register('installWindowsExtension')}
                            className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                            disabled={isConfiguring}
                          />
                          <span className="ml-2 text-sm text-purple-700">
                            Install .NET Datadog APM Extension
                            <span className="ml-2 font-mono text-xs bg-purple-100 px-2 py-1 rounded">
                              Extension
                            </span>
                          </span>
                        </label>
                        <p className="mt-1 text-xs text-purple-600 ml-6">
                          Automatically install the Datadog APM extension from
                          the Azure Marketplace. Your app service must be
                          stopped during installation.
                        </p>
                      </div>

                      <div className="p-3 bg-purple-100 border border-purple-200 rounded-md">
                        <p className="text-xs text-purple-700">
                          <strong>Windows Setup:</strong> The Datadog APM
                          extension will be installed from the Azure Extensions
                          gallery. This provides automatic instrumentation for
                          .NET applications without code changes.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!appServiceType && (
                  <div className="p-4 bg-gray-100 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-600 text-center">
                      Please select an App Service above to see deployment
                      configuration options.
                    </p>
                  </div>
                )}
              </div>

              {/* Datadog CI CLI Alternative */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  🔄 Alternative: Use Datadog CI CLI
                </h3>
                <p className="text-blue-800 mb-3">
                  Prefer using the command line? Use the datadog-ci CLI to
                  instrument your App Service:
                </p>
                <div className="bg-gray-900 text-green-400 rounded-lg font-mono text-xs relative w-full max-w-5xl">
                  <div className="flex items-center justify-between p-4 pb-2">
                    <div className="flex items-center">
                      <div className="flex space-x-2 mr-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-gray-400 text-xs">Terminal</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const apiKey =
                          watch('apiKey') || '<YOUR_DATADOG_API_KEY>';
                        const datadogSite =
                          watch('datadogSite') || 'datadoghq.com';
                        const subscription =
                          watch('subscription') || '<SUBSCRIPTION_ID>';
                        const resourceGroup =
                          watch('resourceGroup') || '<RESOURCE_GROUP_NAME>';
                        const appService =
                          watch('appService') || '<APP_SERVICE_NAME>';
                        const serviceName =
                          watch('serviceName') || '<SERVICE_NAME>';
                        const environment =
                          watch('environment') || '<ENVIRONMENT>';
                        const isDotNet = watch('isDotNet') || false;

                        const commands = `# Set Datadog environment variables
export DD_API_KEY=${apiKey}
export DD_SITE=${datadogSite}

# Instrument your App Service
datadog-ci aas instrument -s ${subscription} -r ${resourceGroup} -n ${appService} --service ${serviceName} --env ${environment}${isDotNet ? ' --dotnet' : ''}`;

                        navigator.clipboard.writeText(commands);
                        setDebugInfo(
                          'Datadog CI commands copied to clipboard! 📋'
                        );
                      }}
                      className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                      title="Copy full command with actual values"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div className="px-4 pb-4 space-y-2 overflow-x-auto">
                    <div className="flex min-w-max">
                      <span className="text-blue-400 mr-2">$</span>
                      <span className="text-gray-300">
                        # Set Datadog environment variables
                      </span>
                    </div>
                    <div className="flex min-w-max">
                      <span className="text-blue-400 mr-2">$</span>
                      <span>
                        export DD_API_KEY=
                        <span
                          className="text-red-400 cursor-pointer relative group"
                          title={
                            apiKeyRevealed
                              ? `Hiding in ${apiKeyCountdown}s`
                              : watch('apiKey')
                                ? 'Click to reveal API key for 5 seconds'
                                : 'Enter your Datadog API key first'
                          }
                          onClick={() => {
                            const apiKey = watch('apiKey');
                            if (apiKey && !apiKeyRevealed) {
                              setApiKeyRevealed(true);
                              setApiKeyCountdown(5);
                            } else if (apiKey && apiKeyRevealed) {
                              navigator.clipboard.writeText(apiKey);
                              setDebugInfo('API key copied to clipboard! 🔑');
                            } else if (!apiKey) {
                              setDebugInfo(
                                'No API key set. Please enter your Datadog API key first.'
                              );
                            }
                          }}
                        >
                          {watch('apiKey') && apiKeyRevealed ? (
                            <span className="text-green-400">
                              {watch('apiKey')}
                              <span className="text-yellow-400 ml-2">
                                ({apiKeyCountdown}s)
                              </span>
                            </span>
                          ) : watch('apiKey') ? (
                            '••••••••••••••••••••••••••••••••'
                          ) : (
                            'YOUR_DATADOG_API_KEY'
                          )}
                          {!apiKeyRevealed && (
                            <span className="absolute left-0 top-6 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                              {watch('apiKey')
                                ? 'Click to reveal for 5 seconds'
                                : 'Enter your Datadog API key first'}
                            </span>
                          )}
                        </span>
                      </span>
                    </div>
                    <div className="flex min-w-max">
                      <span className="text-blue-400 mr-2">$</span>
                      <span>
                        export DD_SITE=
                        <span className="text-yellow-400">
                          {watch('datadogSite') || 'datadoghq.com'}
                        </span>
                      </span>
                    </div>
                    <div className="flex min-w-max">
                      <span className="text-blue-400 mr-2">$</span>
                      <span className="text-gray-300">
                        # Instrument your App Service
                      </span>
                    </div>
                    <div className="flex min-w-max">
                      <span className="text-blue-400 mr-2">$</span>
                      <span className="whitespace-nowrap">
                        datadog-ci aas instrument -s{' '}
                        <span className="text-yellow-400">
                          {watch('subscription') || 'SUBSCRIPTION_ID'}
                        </span>{' '}
                        -r{' '}
                        <span className="text-yellow-400">
                          {watch('resourceGroup') || 'RESOURCE_GROUP_NAME'}
                        </span>{' '}
                        -n{' '}
                        <span className="text-yellow-400">
                          {watch('appService') || 'APP_SERVICE_NAME'}
                        </span>{' '}
                        --service{' '}
                        <span className="text-yellow-400">
                          {watch('serviceName') || 'SERVICE_NAME'}
                        </span>{' '}
                        --env{' '}
                        <span className="text-yellow-400">
                          {watch('environment') || 'ENVIRONMENT'}
                        </span>
                        {watch('isDotNet') ? ' --dotnet' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded-md">
                  <p className="text-blue-800 text-sm">
                    <strong>Note:</strong> This command will be populated with
                    your form values when you fill out the fields above. The{' '}
                    <code className="bg-blue-200 px-1 rounded">--dotnet</code>{' '}
                    flag will be added automatically if a .NET runtime is
                    detected.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="border-t border-gray-200 pt-6 mt-6">
                {/* Validation Error Summary */}
                {Object.keys(errors).length > 0 && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <h4 className="text-sm font-medium text-red-800 mb-2">
                      Please fix the following errors:
                    </h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {Object.entries(errors).map(([field, error]) => (
                        <li key={field}>
                          • {field}: {error?.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isValid || isConfiguring}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center"
                >
                  {isConfiguring ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span className="ml-2">Configuring...</span>
                    </>
                  ) : (
                    'Configure Datadog APM'
                  )}
                </button>

                {/* Debug Info for Form State */}
                {!isValid && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                    Form validation status: {isValid ? 'Valid' : 'Invalid'} |
                    Errors: {Object.keys(errors).length} | App Service Type:{' '}
                    {appServiceType || 'Unknown'} | Is .NET:{' '}
                    {watchIsDotNet ? 'Yes' : 'No'} | Sidecar Image:{' '}
                    {watchSidecarImage || 'Not set'} | Sidecar Port:{' '}
                    {watchSidecarPort || 'Not set'} | Registry URL:{' '}
                    {watchSidecarRegistryUrl || 'Not set'}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Configuration Status */}
        {configurationSteps.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">
              Configuration Progress
            </h3>
            <div className="space-y-3">
              {configurationSteps.map(step => (
                <div key={step.id} className="flex items-center space-x-3">
                  <div
                    className={`w-4 h-4 rounded-full flex-shrink-0 ${
                      step.status === 'completed'
                        ? 'bg-green-500'
                        : step.status === 'running'
                          ? 'bg-blue-500 animate-pulse'
                          : step.status === 'error'
                            ? 'bg-red-500'
                            : 'bg-gray-300'
                    }`}
                  />
                  <span
                    className={`${
                      step.status === 'error' ? 'text-red-600' : 'text-gray-700'
                    }`}
                  >
                    {step.name}
                  </span>
                  {step.status === 'running' && <LoadingSpinner size="small" />}
                  {step.error && (
                    <span className="text-red-500 text-sm">- {step.error}</span>
                  )}
                </div>
              ))}
            </div>
            {configurationSuccess && (
              <div className="mt-4 p-4 bg-green-50 rounded-md">
                <p className="text-green-800 font-medium">
                  ✅ Configuration completed successfully! Your App Service is
                  now configured with Datadog APM.
                </p>
              </div>
            )}
            {configurationError && (
              <div className="mt-4">
                <ErrorAlert message={configurationError} />
              </div>
            )}
            <button
              onClick={resetConfiguration}
              className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Reset Configuration
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            What this does:
          </h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>
              • Sets environment variables (DD_API_KEY, DD_SITE, DD_SERVICE,
              etc.)
            </li>
            <li>• Configures sidecar container for non-.NET applications</li>
            <li>• Adds .NET-specific configuration for .NET applications</li>
            <li>• Restarts your application to apply changes</li>
          </ul>
          <p className="text-blue-700 text-sm mt-3">
            <strong>Note:</strong> This configuration method requires
            appropriate Azure RBAC permissions on your App Service resource.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DatadogConfigPage;
