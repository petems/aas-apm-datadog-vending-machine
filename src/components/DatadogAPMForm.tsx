import React, { useState, useEffect, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest, armApiRequest } from '../authConfig';
import { AzureService } from '../services/azureService';
import {
  AzureSubscription,
  AzureAppService,
  DatadogSite,
  DeploymentParameters,
} from '../types';
import LoadingSpinner from './LoadingSpinner';
import ErrorAlert from './ErrorAlert';

const DATADOG_SITES: DatadogSite[] = [
  { value: 'datadoghq.com', label: 'US1 (datadoghq.com)' },
  { value: 'datadoghq.eu', label: 'EU1 (datadoghq.eu)' },
  { value: 'us3.datadoghq.com', label: 'US3 (us3.datadoghq.com)' },
  { value: 'us5.datadoghq.com', label: 'US5 (us5.datadoghq.com)' },
  { value: 'ap1.datadoghq.com', label: 'AP1 (ap1.datadoghq.com)' },
];

const DatadogAPMForm: React.FC = () => {
  const { instance, accounts } = useMsal();

  // State management
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<AzureSubscription[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState('');
  const [appServices, setAppServices] = useState<AzureAppService[]>([]);
  const [selectedAppService, setSelectedAppService] = useState('');
  const [selectedDatadogSite, setSelectedDatadogSite] =
    useState('datadoghq.com');
  const [ddApiKey, setDdApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<
    'idle' | 'deploying' | 'success' | 'error'
  >('idle');

  const acquireToken = useCallback(async () => {
    try {
      const firstAccount = accounts[0];
      if (!firstAccount) {
        throw new Error('No account available');
      }

      const response = await instance.acquireTokenSilent({
        ...armApiRequest,
        account: firstAccount,
      });
      setAccessToken(response.accessToken);
      await loadSubscriptions(response.accessToken);
    } catch (error) {
      console.error(
        'Silent token acquisition failed, falling back to redirect',
        error
      );
      try {
        const response = await instance.acquireTokenPopup(armApiRequest);
        setAccessToken(response.accessToken);
        await loadSubscriptions(response.accessToken);
      } catch (popupError) {
        console.error('Token acquisition failed', popupError);
        setError('Failed to acquire access token for Azure API');
      }
    }
  }, [instance, accounts]);

  useEffect(() => {
    if (accounts.length > 0) {
      setIsAuthenticated(true);
      acquireToken();
    }
  }, [accounts, acquireToken]);

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error('Login failed', error);
      setError('Authentication failed. Please try again.');
    }
  };

  const handleLogout = () => {
    instance.logoutPopup();
    setIsAuthenticated(false);
    setAccessToken(null);
    resetForm();
  };

  const resetForm = () => {
    setSubscriptions([]);
    setSelectedSubscription('');
    setAppServices([]);
    setSelectedAppService('');
    setDdApiKey('');
    setError(null);
    setDeploymentStatus('idle');
  };

  const loadSubscriptions = async (token: string) => {
    try {
      setIsLoading(true);
      const azureService = new AzureService(token);
      const subs = await azureService.getSubscriptions();
      setSubscriptions(subs);
    } catch (error) {
      console.error('Failed to load subscriptions', error);
      setError(
        'Failed to load Azure subscriptions. Please check your permissions.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadAppServices = async (subscriptionId: string) => {
    if (!accessToken) return;

    try {
      setIsLoading(true);
      const azureService = new AzureService(accessToken);
      const services = await azureService.getAppServices(subscriptionId);
      setAppServices(services);
    } catch (error) {
      console.error('Failed to load app services', error);
      setError('Failed to load App Services. Please check your permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscriptionChange = (subscriptionId: string) => {
    setSelectedSubscription(subscriptionId);
    setSelectedAppService('');
    setAppServices([]);
    if (subscriptionId) {
      loadAppServices(subscriptionId);
    }
  };

  const getARMTemplateUri = (isWindows: boolean): string => {
    const { origin, pathname } = window.location;
    const basePath = pathname.endsWith('/') ? pathname : `${pathname}/`;
    return `${origin}${basePath}arm/${
      isWindows ? 'windows' : 'linux'
    }-appservice-datadog.json`;
  };

  const handleDeploy = async () => {
    if (!accessToken || !selectedAppService || !ddApiKey) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setDeploymentStatus('deploying');
      setIsLoading(true);
      setError(null);

      const azureService = new AzureService(accessToken);
      const selectedApp = appServices.find(
        app => app.id === selectedAppService
      );

      if (!selectedApp) {
        throw new Error('Selected app service not found');
      }

      // Extract resource group from the app service ID
      const resourceGroupMatch = selectedApp.id.match(
        /resourceGroups\/([^/]+)/
      );
      const resourceGroupName = resourceGroupMatch ? resourceGroupMatch[1] : '';

      if (!resourceGroupName) {
        throw new Error('Could not determine resource group name');
      }

      // Determine if it's Windows or Linux
      const isWindows = azureService.isWindowsAppService(selectedApp);
      const templateUri = getARMTemplateUri(isWindows);

      const deploymentParameters: DeploymentParameters = {
        siteName: selectedApp.name,
        location: selectedApp.location,
        ddApiKey: ddApiKey,
        ddSite: selectedDatadogSite,
      };

      const deploymentName = `datadog-apm-${selectedApp.name}-${Date.now()}`;

      await azureService.deployDatadogAPM(
        selectedSubscription,
        resourceGroupName,
        deploymentName,
        templateUri,
        deploymentParameters
      );

      setDeploymentStatus('success');
    } catch (error) {
      console.error('Deployment failed', error);
      setError(
        `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      setDeploymentStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Azure Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please sign in to your Azure account to access your subscriptions
            and app services.
          </p>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Sign in with Azure
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Datadog APM for Azure
        </h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Sign out
        </button>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {deploymentStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Deployment Successful!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Datadog APM has been successfully enabled on your App Service.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={e => {
          e.preventDefault();
          handleDeploy();
        }}
        className="space-y-6"
      >
        {/* Subscription Selection */}
        <div>
          <label
            htmlFor="subscription"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Azure Subscription *
          </label>
          {isLoading && subscriptions.length === 0 ? (
            <LoadingSpinner size="small" message="Loading subscriptions..." />
          ) : (
            <select
              id="subscription"
              value={selectedSubscription}
              onChange={e => handleSubscriptionChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a subscription</option>
              {subscriptions.map(sub => (
                <option key={sub.subscriptionId} value={sub.subscriptionId}>
                  {sub.displayName} ({sub.subscriptionId})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* App Service Selection */}
        <div>
          <label
            htmlFor="appService"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            App Service / Function App *
          </label>
          {isLoading && selectedSubscription && appServices.length === 0 ? (
            <LoadingSpinner size="small" message="Loading app services..." />
          ) : (
            <select
              id="appService"
              value={selectedAppService}
              onChange={e => setSelectedAppService(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!selectedSubscription}
              required
            >
              <option value="">Select an app service</option>
              {appServices.map(app => (
                <option key={app.id} value={app.id}>
                  {app.name} ({app.kind || 'app'}) - {app.location}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Datadog Site Selection */}
        <div>
          <label
            htmlFor="datadogSite"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Datadog Site *
          </label>
          <select
            id="datadogSite"
            value={selectedDatadogSite}
            onChange={e => setSelectedDatadogSite(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            {DATADOG_SITES.map(site => (
              <option key={site.value} value={site.value}>
                {site.label}
              </option>
            ))}
          </select>
        </div>

        {/* Datadog API Key */}
        <div>
          <label
            htmlFor="ddApiKey"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Datadog API Key *
          </label>
          <input
            type="password"
            id="ddApiKey"
            value={ddApiKey}
            onChange={e => setDdApiKey(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your Datadog API key"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            You can find your API key in your Datadog account under Organization
            Settings → API Keys
          </p>
        </div>

        {/* Deploy Button */}
        <button
          type="submit"
          disabled={
            isLoading ||
            deploymentStatus === 'deploying' ||
            !selectedAppService ||
            !ddApiKey
          }
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
        >
          {deploymentStatus === 'deploying' ? (
            <>
              <LoadingSpinner size="small" />
              <span className="ml-2">Deploying...</span>
            </>
          ) : (
            'Enable Datadog APM'
          )}
        </button>
      </form>

      <div className="mt-6 text-xs text-gray-500">
        <p>
          * Required fields. This will deploy ARM templates to configure Datadog
          APM monitoring on your selected App Service.
        </p>
      </div>
    </div>
  );
};

export default DatadogAPMForm;
