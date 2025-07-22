import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useMsal } from '@azure/msal-react';
import DatadogAPMForm from '../DatadogAPMForm';
import { AzureService } from '../../services/azureService';
import { mockSubscription, mockAppService, mockAuthResponse } from '../../test-utils';

// Mock the Azure service
jest.mock('../../services/azureService', () => {
  const mockGetSubscriptions = jest.fn();
  const mockGetAppServices = jest.fn();
  const mockDeployDatadogAPM = jest.fn();
  const mockIsWindowsAppService = jest.fn();
  const mockGetARMTemplateUri = jest.fn();

  return {
    AzureService: jest.fn().mockImplementation(() => ({
      getSubscriptions: mockGetSubscriptions,
      getAppServices: mockGetAppServices,
      deployDatadogAPM: mockDeployDatadogAPM,
      isWindowsAppService: mockIsWindowsAppService,
      getARMTemplateUri: mockGetARMTemplateUri,
    })),
    // Export the mocks so we can access them in tests
    __mockGetSubscriptions: mockGetSubscriptions,
    __mockGetAppServices: mockGetAppServices,
    __mockDeployDatadogAPM: mockDeployDatadogAPM,
    __mockIsWindowsAppService: mockIsWindowsAppService,
    __mockGetARMTemplateUri: mockGetARMTemplateUri,
  };
});

// Import the mocks
const {
  __mockGetSubscriptions: mockGetSubscriptions,
  __mockGetAppServices: mockGetAppServices,
  __mockDeployDatadogAPM: mockDeployDatadogAPM,
  __mockIsWindowsAppService: mockIsWindowsAppService,
  __mockGetARMTemplateUri: mockGetARMTemplateUri,
} = require('../../services/azureService');

// Mock useMsal hook
const mockUseMsal = useMsal as jest.MockedFunction<typeof useMsal>;

describe.skip('DatadogAPMForm @integration', () => {
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
    mockGetSubscriptions.mockImplementation(() => {
      console.log('mockGetSubscriptions called');
      return Promise.resolve([mockSubscription]);
    });
    mockGetAppServices.mockResolvedValue([mockAppService]);
    mockDeployDatadogAPM.mockResolvedValue({ success: true });
    mockIsWindowsAppService.mockReturnValue(true);
    mockGetARMTemplateUri.mockReturnValue('https://example.com/template.json');
  });

  it('renders login button when not authenticated', () => {
    mockUseMsal.mockReturnValue({
      instance: mockInstance as any,
      accounts: [],
      inProgress: 'none' as any,
      logger: {} as any,
    });

    render(<DatadogAPMForm />);
    
    expect(screen.getByRole('button', { name: /sign in with azure/i })).toBeInTheDocument();
  });

  it('handles login process', async () => {
    mockUseMsal.mockReturnValue({
      instance: mockInstance as any,
      accounts: [],
      inProgress: 'none' as any,
      logger: {} as any,
    });

    render(<DatadogAPMForm />);
    
    const loginButton = screen.getByRole('button', { name: /sign in with azure/i });
    fireEvent.click(loginButton);
    
    expect(mockInstance.loginPopup).toHaveBeenCalled();
  });

  it('loads subscriptions after authentication', async () => {
    render(<DatadogAPMForm />);
    
    await waitFor(() => {
      expect(mockGetSubscriptions).toHaveBeenCalled();
    });

    expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
  });

  it('loads app services when subscription is selected', async () => {
    render(<DatadogAPMForm />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
    });

    // Select subscription
    const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
    fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

    await waitFor(() => {
      expect(mockGetAppServices).toHaveBeenCalledWith('mock-access-token', mockSubscription.subscriptionId);
    });
  });

  it('renders all form fields when authenticated', async () => {
    render(<DatadogAPMForm />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/azure subscription/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/app service/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/datadog site/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/datadog api key/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enable datadog apm/i })).toBeInTheDocument();
  });

  it('validates required fields before submission', async () => {
    render(<DatadogAPMForm />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enable datadog apm/i })).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /enable datadog apm/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when all required fields are filled', async () => {
    render(<DatadogAPMForm />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
    });

    // Select subscription
    const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
    fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

    // Wait for app services to load
    await waitFor(() => {
      expect(mockGetAppServices).toHaveBeenCalled();
    });

    // Select app service
    const appServiceSelect = screen.getByRole('combobox', { name: /app service/i });
    fireEvent.change(appServiceSelect, { target: { value: mockAppService.id } });

    // Enter API key
    const apiKeyInput = screen.getByLabelText(/datadog api key/i);
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });

    // Submit button should now be enabled
    const submitButton = screen.getByRole('button', { name: /enable datadog apm/i });
    expect(submitButton).toBeEnabled();
  });

  it('handles form submission', async () => {
    render(<DatadogAPMForm />);
    
    // Wait for initial load and fill form
    await waitFor(() => {
      expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
    });

    const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
    fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

    await waitFor(() => {
      expect(mockGetAppServices).toHaveBeenCalled();
    });

    const appServiceSelect = screen.getByRole('combobox', { name: /app service/i });
    fireEvent.change(appServiceSelect, { target: { value: mockAppService.id } });

    const apiKeyInput = screen.getByLabelText(/datadog api key/i);
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });

    const form = screen.getByRole('form') || screen.getByTestId('datadog-form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockDeployDatadogAPM).toHaveBeenCalledWith(
        mockSubscription.subscriptionId,
        expect.any(String), // resourceGroupName
        expect.stringMatching(/datadog-apm-.*/), // deploymentName
        expect.any(String), // templateUri
        expect.objectContaining({
          siteName: mockAppService.name,
          location: mockAppService.location,
          ddApiKey: 'test-api-key',
          ddSite: 'datadoghq.com',
        })
      );
    });
  });

  it('shows error message when deployment fails', async () => {
    mockDeployDatadogAPM.mockRejectedValue(new Error('Deployment failed'));

    render(<DatadogAPMForm />);
    
    // Fill and submit form
    await waitFor(() => {
      expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
    });

    const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
    fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

    await waitFor(() => {
      expect(mockGetAppServices).toHaveBeenCalled();
    });

    const appServiceSelect = screen.getByRole('combobox', { name: /app service/i });
    fireEvent.change(appServiceSelect, { target: { value: mockAppService.id } });

    const apiKeyInput = screen.getByLabelText(/datadog api key/i);
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });

    const form = screen.getByRole('form') || screen.getByTestId('datadog-form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/deployment failed/i)).toBeInTheDocument();
    });
  });

  it('handles token acquisition failure', async () => {
    mockInstance.acquireTokenSilent.mockRejectedValue(new Error('Token acquisition failed'));
    mockInstance.acquireTokenPopup.mockRejectedValue(new Error('Popup blocked'));

    render(<DatadogAPMForm />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to acquire access token for Azure API/i)).toBeInTheDocument();
    });
  });

  it('displays all Datadog site options', async () => {
    render(<DatadogAPMForm />);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/datadog site/i)).toBeInTheDocument();
    });

    const siteSelect = screen.getByLabelText(/datadog site/i);
    
    // Check that all Datadog sites are available
    expect(siteSelect).toContainHTML('US1 (datadoghq.com)');
    expect(siteSelect).toContainHTML('EU1 (datadoghq.eu)');
    expect(siteSelect).toContainHTML('US3 (us3.datadoghq.com)');
    expect(siteSelect).toContainHTML('US5 (us5.datadoghq.com)');
    expect(siteSelect).toContainHTML('AP1 (ap1.datadoghq.com)');
  });

  it('shows loading state during deployment', async () => {
    // Make deployment hang to test loading state
    mockDeployDatadogAPM.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<DatadogAPMForm />);
    
    // Fill and submit form
    await waitFor(() => {
      expect(screen.getByDisplayValue(mockSubscription.displayName)).toBeInTheDocument();
    });

    const subscriptionSelect = screen.getByRole('combobox', { name: /azure subscription/i });
    fireEvent.change(subscriptionSelect, { target: { value: mockSubscription.subscriptionId } });

    await waitFor(() => {
      expect(mockGetAppServices).toHaveBeenCalled();
    });

    const appServiceSelect = screen.getByRole('combobox', { name: /app service/i });
    fireEvent.change(appServiceSelect, { target: { value: mockAppService.id } });

    const apiKeyInput = screen.getByLabelText(/datadog api key/i);
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });

    const form = screen.getByRole('form') || screen.getByTestId('datadog-form');
    fireEvent.submit(form);

    // Check for loading state
    await waitFor(() => {
      expect(screen.getByText(/deploying/i)).toBeInTheDocument();
    });
  });
});