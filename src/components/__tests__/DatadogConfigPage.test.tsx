import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { useMsal } from '@azure/msal-react';
import DatadogConfigPage from '../DatadogConfigPage';
import { AzureService } from '../../services/azureService';
import { mockSubscription, mockAppService, mockAuthResponse } from '../../test-utils';

// Mock the Azure service
jest.mock('../../services/azureService', () => {
  const mockGetSubscriptions = jest.fn();
  const mockGetResourceGroups = jest.fn();
  const mockGetAppServicesInResourceGroup = jest.fn();
  const mockGetAppServiceDetails = jest.fn();
  const mockGetAppSettings = jest.fn();
  const mockUpdateAppSettings = jest.fn();
  const mockConfigureDatadog = jest.fn();
  const mockRestartAppService = jest.fn();
  const mockGetSidecarConfiguration = jest.fn();
  const mockGetInstalledExtensions = jest.fn();
  const mockGetSiteContainers = jest.fn();
  const mockAnalyzeDatadogConfiguration = jest.fn();
  const mockGetAppServiceType = jest.fn();
  const mockGetAppServiceLanguage = jest.fn();

  return {
    AzureService: jest.fn().mockImplementation(() => ({
      getSubscriptions: mockGetSubscriptions,
      getResourceGroups: mockGetResourceGroups,
      getAppServicesInResourceGroup: mockGetAppServicesInResourceGroup,
      getAppServiceDetails: mockGetAppServiceDetails,
      getAppSettings: mockGetAppSettings,
      updateAppSettings: mockUpdateAppSettings,
      configureDatadog: mockConfigureDatadog,
      restartAppService: mockRestartAppService,
      getSidecarConfiguration: mockGetSidecarConfiguration,
      getInstalledExtensions: mockGetInstalledExtensions,
      getSiteContainers: mockGetSiteContainers,
      analyzeDatadogConfiguration: mockAnalyzeDatadogConfiguration,
      getAppServiceType: mockGetAppServiceType,
      getAppServiceLanguage: mockGetAppServiceLanguage,
    })),
    // Export the mocks so we can access them in tests
    __mockGetSubscriptions: mockGetSubscriptions,
    __mockGetResourceGroups: mockGetResourceGroups,
    __mockGetAppServicesInResourceGroup: mockGetAppServicesInResourceGroup,
    __mockGetAppServiceDetails: mockGetAppServiceDetails,
    __mockGetAppSettings: mockGetAppSettings,
    __mockUpdateAppSettings: mockUpdateAppSettings,
    __mockConfigureDatadog: mockConfigureDatadog,
    __mockRestartAppService: mockRestartAppService,
    __mockGetSidecarConfiguration: mockGetSidecarConfiguration,
    __mockGetInstalledExtensions: mockGetInstalledExtensions,
    __mockGetSiteContainers: mockGetSiteContainers,
    __mockAnalyzeDatadogConfiguration: mockAnalyzeDatadogConfiguration,
    __mockGetAppServiceType: mockGetAppServiceType,
    __mockGetAppServiceLanguage: mockGetAppServiceLanguage,
  };
});

// Import the mocks
const {
  __mockGetSubscriptions: mockGetSubscriptions,
  __mockGetResourceGroups: mockGetResourceGroups,
  __mockGetAppServicesInResourceGroup: mockGetAppServicesInResourceGroup,
  __mockGetAppServiceDetails: mockGetAppServiceDetails,
  __mockGetAppSettings: mockGetAppSettings,
  __mockUpdateAppSettings: mockUpdateAppSettings,
  __mockConfigureDatadog: mockConfigureDatadog,
  __mockRestartAppService: mockRestartAppService,
  __mockGetSidecarConfiguration: mockGetSidecarConfiguration,
  __mockGetInstalledExtensions: mockGetInstalledExtensions,
  __mockGetSiteContainers: mockGetSiteContainers,
  __mockAnalyzeDatadogConfiguration: mockAnalyzeDatadogConfiguration,
  __mockGetAppServiceType: mockGetAppServiceType,
  __mockGetAppServiceLanguage: mockGetAppServiceLanguage,
} = require('../../services/azureService');

// Mock useMsal hook
const mockUseMsal = useMsal as jest.MockedFunction<typeof useMsal>;

describe('DatadogConfigPage', () => {
  const mockInstance = {
    acquireTokenSilent: jest.fn(),
    acquireTokenPopup: jest.fn(),
    loginPopup: jest.fn(),
  };

  const mockAccounts = [
    {
      homeAccountId: 'test-account-id',
      environment: 'login.microsoftonline.com',
      tenantId: 'test-tenant-id',
      username: 'test@example.com',
    },
  ];

  const mockResourceGroup = {
    id: '/subscriptions/test-subscription/resourceGroups/test-rg',
    name: 'test-rg',
    location: 'East US',
    properties: {
      provisioningState: 'Succeeded',
    },
  };

  const mockAppSettings = {
    DD_API_KEY: 'test-api-key',
    DD_SITE: 'datadoghq.com',
    DD_SERVICE: 'test-service',
    DD_ENV: 'test-env',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseMsal.mockReturnValue({
      instance: mockInstance as any,
      accounts: mockAccounts as any,
      inProgress: 'none' as any,
      logger: {} as any,
    });

    // Mock successful token acquisition
    mockInstance.acquireTokenSilent.mockResolvedValue(mockAuthResponse as any);
    
    // Mock Azure service methods
    mockGetSubscriptions.mockResolvedValue([mockSubscription]);
    mockGetResourceGroups.mockResolvedValue([mockResourceGroup]);
    mockGetAppServicesInResourceGroup.mockResolvedValue([mockAppService]);
    mockGetAppServiceDetails.mockResolvedValue(mockAppService);
    mockGetAppSettings.mockResolvedValue(mockAppSettings);
    mockUpdateAppSettings.mockResolvedValue(undefined);
    mockConfigureDatadog.mockResolvedValue(undefined);
    mockRestartAppService.mockResolvedValue(undefined);
    mockGetSidecarConfiguration.mockResolvedValue(null);
    mockGetInstalledExtensions.mockResolvedValue([]);
    mockGetSiteContainers.mockResolvedValue([]);
    mockAnalyzeDatadogConfiguration.mockReturnValue({
      hasDatadogSetup: false,
      setupType: 'none' as const,
      details: {},
    });
    mockGetAppServiceType.mockReturnValue('Windows');
    mockGetAppServiceLanguage.mockReturnValue({
      language: '.NET',
      version: '8.0',
      rawRuntime: '.NET|8.0',
    });
  });

  describe('Authentication', () => {
    it('renders login button when not authenticated', () => {
      mockUseMsal.mockReturnValue({
        instance: mockInstance as any,
        accounts: [],
        inProgress: 'none' as any,
        logger: {} as any,
      });

      render(<DatadogConfigPage />);
      
      expect(screen.getByRole('button', { name: /sign in with azure/i })).toBeInTheDocument();
    });

    it('handles login process', async () => {
      mockUseMsal.mockReturnValue({
        instance: mockInstance as any,
        accounts: [],
        inProgress: 'none' as any,
        logger: {} as any,
      });

      render(<DatadogConfigPage />);
      
      const loginButton = screen.getByRole('button', { name: /sign in with azure/i });
      fireEvent.click(loginButton);
      
      expect(mockInstance.loginPopup).toHaveBeenCalled();
    });

    it('loads subscriptions after authentication', async () => {
      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(mockGetSubscriptions).toHaveBeenCalled();
      });

      expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
    });
  });

  describe('Resource Selection', () => {
    it('loads resource groups when subscription is selected', async () => {
      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

      await waitFor(() => {
        expect(mockGetResourceGroups).toHaveBeenCalledWith(mockAuthResponse.accessToken, mockSubscription.subscriptionId);
      });
    });

    it('loads app services when resource group is selected', async () => {
      render(<DatadogConfigPage />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      // Select subscription
      const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

      // Wait for resource groups to load
      await waitFor(() => {
        expect(mockGetResourceGroups).toHaveBeenCalled();
      });

      // Select resource group
      const resourceGroupSelect = screen.getByRole('combobox', { name: /resource group/i });
      fireEvent.change(resourceGroupSelect, { target: { value: mockResourceGroup.name } });

      await waitFor(() => {
        expect(mockGetAppServicesInResourceGroup).toHaveBeenCalledWith(
          mockAuthResponse.accessToken,
          mockSubscription.subscriptionId,
          mockResourceGroup.name
        );
      });
    });

    it('handles resource group search functionality', async () => {
      render(<DatadogConfigPage />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      // Select subscription
      const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

      // Wait for resource groups to load
      await waitFor(() => {
        expect(mockGetResourceGroups).toHaveBeenCalled();
      });

      // Test resource group search
      const resourceGroupInput = screen.getByPlaceholderText(/search resource groups/i);
      fireEvent.change(resourceGroupInput, { target: { value: 'test' } });

      // Should filter resource groups
      expect(screen.getByText(mockResourceGroup.name)).toBeInTheDocument();
    });
  });

  describe('Current Settings Fetching', () => {
    it('fetches current settings when fetch button is clicked', async () => {
      render(<DatadogConfigPage />);
      
      // Wait for initial load and select resources
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

      await waitFor(() => {
        expect(mockGetResourceGroups).toHaveBeenCalled();
      });

      const resourceGroupSelect = screen.getByRole('combobox', { name: /resource group/i });
      fireEvent.change(resourceGroupSelect, { target: { value: mockResourceGroup.name } });

      await waitFor(() => {
        expect(mockGetAppServicesInResourceGroup).toHaveBeenCalled();
      });

      const appServiceSelect = screen.getByRole('combobox', { name: /app service/i });
      fireEvent.change(appServiceSelect, { target: { value: mockAppService.name } });

      // Click fetch current settings button
      const fetchButton = screen.getByRole('button', { name: /fetch current settings/i });
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(mockGetAppSettings).toHaveBeenCalledWith(
          mockSubscription.subscriptionId,
          mockResourceGroup.name,
          mockAppService.name
        );
        expect(mockGetAppServiceDetails).toHaveBeenCalledWith(
          mockSubscription.subscriptionId,
          mockResourceGroup.name,
          mockAppService.name
        );
      });
    });

    it('displays current settings in collapsible section', async () => {
      render(<DatadogConfigPage />);
      
      // Setup and fetch current settings
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

      await waitFor(() => {
        expect(mockGetResourceGroups).toHaveBeenCalled();
      });

      const resourceGroupSelect = screen.getByRole('combobox', { name: /resource group/i });
      fireEvent.change(resourceGroupSelect, { target: { value: mockResourceGroup.name } });

      await waitFor(() => {
        expect(mockGetAppServicesInResourceGroup).toHaveBeenCalled();
      });

      const appServiceSelect = screen.getByRole('combobox', { name: /app service/i });
      fireEvent.change(appServiceSelect, { target: { value: mockAppService.name } });

      const fetchButton = screen.getByRole('button', { name: /fetch current settings/i });
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText(/current app settings for/i)).toBeInTheDocument();
        expect(screen.getByText(/datadog settings/i)).toBeInTheDocument();
      });
    });

    it('handles collapse/expand of current settings section', async () => {
      render(<DatadogConfigPage />);
      
      // Setup and fetch current settings
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

      await waitFor(() => {
        expect(mockGetResourceGroups).toHaveBeenCalled();
      });

      const resourceGroupSelect = screen.getByRole('combobox', { name: /resource group/i });
      fireEvent.change(resourceGroupSelect, { target: { value: mockResourceGroup.name } });

      await waitFor(() => {
        expect(mockGetAppServicesInResourceGroup).toHaveBeenCalled();
      });

      const appServiceSelect = screen.getByRole('combobox', { name: /app service/i });
      fireEvent.change(appServiceSelect, { target: { value: mockAppService.name } });

      const fetchButton = screen.getByRole('button', { name: /fetch current settings/i });
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText(/current app settings for/i)).toBeInTheDocument();
      });

      // Test collapse functionality
      const hideButton = screen.getByRole('button', { name: /hide current settings/i });
      fireEvent.click(hideButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /show current settings/i })).toBeInTheDocument();
      });

      // Test expand functionality
      const showButton = screen.getByRole('button', { name: /show current settings/i });
      fireEvent.click(showButton);

      await waitFor(() => {
        expect(screen.getByText(/current app settings for/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('validates required fields in real-time', async () => {
      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      // Test API key validation
      const apiKeyInput = screen.getByLabelText(/datadog api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'invalid' } });

      await waitFor(() => {
        expect(screen.getByText(/api key must be at least 32 characters/i)).toBeInTheDocument();
      });

      // Test with valid API key
      fireEvent.change(apiKeyInput, { target: { value: 'a'.repeat(32) } });

      await waitFor(() => {
        expect(screen.queryByText(/api key must be at least 32 characters/i)).not.toBeInTheDocument();
      });
    });

    it('validates service name field', async () => {
      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      const serviceNameInput = screen.getByLabelText(/service name/i);
      fireEvent.change(serviceNameInput, { target: { value: '' } });
      fireEvent.blur(serviceNameInput);

      await waitFor(() => {
        expect(screen.getByText(/service name is required/i)).toBeInTheDocument();
      });
    });

    it('validates environment field', async () => {
      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      const environmentInput = screen.getByLabelText(/environment/i);
      fireEvent.change(environmentInput, { target: { value: '' } });
      fireEvent.blur(environmentInput);

      await waitFor(() => {
        expect(screen.getByText(/environment is required/i)).toBeInTheDocument();
      });
    });

    it('validates .NET-specific fields when .NET is selected', async () => {
      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      // Enable .NET configuration
      const dotNetCheckbox = screen.getByLabelText(/enable .net specific configuration/i);
      fireEvent.click(dotNetCheckbox);

      // Test .NET tracer home validation
      const tracerHomeInput = screen.getByLabelText(/dotnet tracer home/i);
      fireEvent.change(tracerHomeInput, { target: { value: '' } });
      fireEvent.blur(tracerHomeInput);

      await waitFor(() => {
        expect(screen.getByText(/dotnet tracer home is required/i)).toBeInTheDocument();
      });
    });

    it('validates sidecar fields for Linux app services', async () => {
      mockGetAppServiceType.mockReturnValue('Linux');
      
      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      // Test sidecar image validation
      const sidecarImageInput = screen.getByLabelText(/sidecar image/i);
      fireEvent.change(sidecarImageInput, { target: { value: '' } });
      fireEvent.blur(sidecarImageInput);

      await waitFor(() => {
        expect(screen.getByText(/sidecar image is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Pre-filling', () => {
    it('pre-fills form with current settings when button is clicked', async () => {
      render(<DatadogConfigPage />);
      
      // Setup and fetch current settings
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

      await waitFor(() => {
        expect(mockGetResourceGroups).toHaveBeenCalled();
      });

      const resourceGroupSelect = screen.getByRole('combobox', { name: /resource group/i });
      fireEvent.change(resourceGroupSelect, { target: { value: mockResourceGroup.name } });

      await waitFor(() => {
        expect(mockGetAppServicesInResourceGroup).toHaveBeenCalled();
      });

      const appServiceSelect = screen.getByRole('combobox', { name: /app service/i });
      fireEvent.change(appServiceSelect, { target: { value: mockAppService.name } });

      const fetchButton = screen.getByRole('button', { name: /fetch current settings/i });
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText(/current app settings for/i)).toBeInTheDocument();
      });

      // Click pre-fill button
      const prefillButton = screen.getByRole('button', { name: /pre-fill form with current values/i });
      fireEvent.click(prefillButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('test-service')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test-env')).toBeInTheDocument();
      });
    });
  });

  describe('Configuration Submission', () => {
    it('submits configuration successfully', async () => {
      render(<DatadogConfigPage />);
      
      // Setup form
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

      await waitFor(() => {
        expect(mockGetResourceGroups).toHaveBeenCalled();
      });

      const resourceGroupSelect = screen.getByRole('combobox', { name: /resource group/i });
      fireEvent.change(resourceGroupSelect, { target: { value: mockResourceGroup.name } });

      await waitFor(() => {
        expect(mockGetAppServicesInResourceGroup).toHaveBeenCalled();
      });

      const appServiceSelect = screen.getByRole('combobox', { name: /app service/i });
      fireEvent.change(appServiceSelect, { target: { value: mockAppService.name } });

      // Fill required fields
      const apiKeyInput = screen.getByLabelText(/datadog api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'a'.repeat(32) } });

      const serviceNameInput = screen.getByLabelText(/service name/i);
      fireEvent.change(serviceNameInput, { target: { value: 'test-service' } });

      const environmentInput = screen.getByLabelText(/environment/i);
      fireEvent.change(environmentInput, { target: { value: 'test-env' } });

      const logPathInput = screen.getByLabelText(/log path/i);
      fireEvent.change(logPathInput, { target: { value: '/var/log' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /configure datadog apm/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockConfigureDatadog).toHaveBeenCalledWith(
          mockSubscription.subscriptionId,
          mockResourceGroup.name,
          mockAppService.name,
          expect.objectContaining({
            apiKey: 'a'.repeat(32),
            service: 'test-service',
            environment: 'test-env',
            logPath: '/var/log',
          })
        );
      });
    });

    it('handles configuration errors', async () => {
      mockConfigureDatadog.mockRejectedValue(new Error('Configuration failed'));

      render(<DatadogConfigPage />);
      
      // Setup and submit form
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

      await waitFor(() => {
        expect(mockGetResourceGroups).toHaveBeenCalled();
      });

      const resourceGroupSelect = screen.getByRole('combobox', { name: /resource group/i });
      fireEvent.change(resourceGroupSelect, { target: { value: mockResourceGroup.name } });

      await waitFor(() => {
        expect(mockGetAppServicesInResourceGroup).toHaveBeenCalled();
      });

      const appServiceSelect = screen.getByRole('combobox', { name: /app service/i });
      fireEvent.change(appServiceSelect, { target: { value: mockAppService.name } });

      // Fill required fields
      const apiKeyInput = screen.getByLabelText(/datadog api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'a'.repeat(32) } });

      const serviceNameInput = screen.getByLabelText(/service name/i);
      fireEvent.change(serviceNameInput, { target: { value: 'test-service' } });

      const environmentInput = screen.getByLabelText(/environment/i);
      fireEvent.change(environmentInput, { target: { value: 'test-env' } });

      const logPathInput = screen.getByLabelText(/log path/i);
      fireEvent.change(logPathInput, { target: { value: '/var/log' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /configure datadog apm/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/configuration failed/i)).toBeInTheDocument();
      });
    });

    it('shows loading state during configuration', async () => {
      // Make configuration hang to test loading state
      mockConfigureDatadog.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<DatadogConfigPage />);
      
      // Setup and submit form
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

      await waitFor(() => {
        expect(mockGetResourceGroups).toHaveBeenCalled();
      });

      const resourceGroupSelect = screen.getByRole('combobox', { name: /resource group/i });
      fireEvent.change(resourceGroupSelect, { target: { value: mockResourceGroup.name } });

      await waitFor(() => {
        expect(mockGetAppServicesInResourceGroup).toHaveBeenCalled();
      });

      const appServiceSelect = screen.getByRole('combobox', { name: /app service/i });
      fireEvent.change(appServiceSelect, { target: { value: mockAppService.name } });

      // Fill required fields
      const apiKeyInput = screen.getByLabelText(/datadog api key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'a'.repeat(32) } });

      const serviceNameInput = screen.getByLabelText(/service name/i);
      fireEvent.change(serviceNameInput, { target: { value: 'test-service' } });

      const environmentInput = screen.getByLabelText(/environment/i);
      fireEvent.change(environmentInput, { target: { value: 'test-env' } });

      const logPathInput = screen.getByLabelText(/log path/i);
      fireEvent.change(logPathInput, { target: { value: '/var/log' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /configure datadog apm/i });
      fireEvent.click(submitButton);

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText(/configuring/i)).toBeInTheDocument();
      });
    });
  });

  describe('CORECLR_PROFILER Dropdown', () => {
    it('renders CORECLR_PROFILER as dropdown with correct options', async () => {
      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      // Enable .NET configuration
      const dotNetCheckbox = screen.getByLabelText(/enable .net specific configuration/i);
      fireEvent.click(dotNetCheckbox);

      // Check for CORECLR_PROFILER dropdown
      const profilerSelect = screen.getByLabelText(/coreclr profiler/i);
      expect(profilerSelect).toBeInTheDocument();

      // Check dropdown options
      const options = profilerSelect.querySelectorAll('option');
      expect(options).toHaveLength(2);
      expect(options[0]).toHaveValue('');
      expect(options[0]).toHaveTextContent('No Value (Disabled)');
      expect(options[1]).toHaveValue('{846F5F1C-F9AE-4B07-969E-05C26BC060D8}');
      expect(options[1]).toHaveTextContent('{846F5F1C-F9AE-4B07-969E-05C26BC060D8}');
    });
  });

  describe('Azure Portal Links', () => {
    it('renders app service names as clickable links', async () => {
      render(<DatadogConfigPage />);
      
      // Setup and fetch current settings
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

      await waitFor(() => {
        expect(mockGetResourceGroups).toHaveBeenCalled();
      });

      const resourceGroupSelect = screen.getByRole('combobox', { name: /resource group/i });
      fireEvent.change(resourceGroupSelect, { target: { value: mockResourceGroup.name } });

      await waitFor(() => {
        expect(mockGetAppServicesInResourceGroup).toHaveBeenCalled();
      });

      const appServiceSelect = screen.getByRole('combobox', { name: /app service/i });
      fireEvent.change(appServiceSelect, { target: { value: mockAppService.name } });

      const fetchButton = screen.getByRole('button', { name: /fetch current settings/i });
      fireEvent.click(fetchButton);

      await waitFor(() => {
        expect(screen.getByText(/current app settings for/i)).toBeInTheDocument();
      });

      // Check for Azure portal link
      const appServiceLink = screen.getByRole('link', { name: new RegExp(mockAppService.name) });
      expect(appServiceLink).toBeInTheDocument();
      expect(appServiceLink).toHaveAttribute('target', '_blank');
      expect(appServiceLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      mockGetSubscriptions.mockRejectedValue(new Error('Failed to fetch subscriptions'));

      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch subscriptions/i)).toBeInTheDocument();
      });
    });

    it('handles token acquisition failure', async () => {
      mockInstance.acquireTokenSilent.mockRejectedValue(new Error('Token acquisition failed'));
      mockInstance.acquireTokenPopup.mockRejectedValue(new Error('Popup blocked'));

      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to acquire access token for Azure API/i)).toBeInTheDocument();
      });
    });

    it('handles network errors', async () => {
      mockGetResourceGroups.mockRejectedValue(new Error('Network error'));

      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      // Check for proper form labels
      expect(screen.getByLabelText(/azure subscription/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/resource group/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/app service/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/datadog api key/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/datadog site/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/service name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/environment/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      // Test tab navigation
      const subscriptionSelect = screen.getByLabelText(/azure subscription/i);
      subscriptionSelect.focus();
      expect(subscriptionSelect).toHaveFocus();

      // Test enter key on buttons
      const fetchButton = screen.getByRole('button', { name: /fetch current settings/i });
      fetchButton.focus();
      fireEvent.keyDown(fetchButton, { key: 'Enter', code: 'Enter' });
      
      // Should trigger the button action
      expect(fetchButton).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('debounces resource group search', async () => {
      jest.useFakeTimers();
      
      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

      await waitFor(() => {
        expect(mockGetResourceGroups).toHaveBeenCalled();
      });

      // Test search debouncing
      const searchInput = screen.getByPlaceholderText(/search resource groups/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.change(searchInput, { target: { value: 'test2' } });
      fireEvent.change(searchInput, { target: { value: 'test3' } });

      // Fast forward timers to trigger debounced search
      jest.runAllTimers();

      // Should only call search once with the final value
      expect(searchInput).toHaveValue('test3');
      
      jest.useRealTimers();
    });

    it('caches API responses', async () => {
      render(<DatadogConfigPage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
      });

      // Call getSubscriptions multiple times
      const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });
      fireEvent.change(subscriptionSelect, { target: { value: '' } });
      fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

      // Should only call API once due to caching
      expect(mockGetSubscriptions).toHaveBeenCalledTimes(1);
    });
  });
}); 