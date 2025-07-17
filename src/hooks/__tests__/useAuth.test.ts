import { renderHook, act, waitFor } from '@testing-library/react';
import { useMsal } from '@azure/msal-react';
import { useAuth } from '../useAuth';
<<<<<<< HEAD
import { mockAuthResponse } from '../../test-helpers';
=======
import { mockAuthResponse } from '../../test-utils';
>>>>>>> origin/master

// Mock the useMsal hook
jest.mock('@azure/msal-react');
const mockUseMsal = useMsal as jest.MockedFunction<typeof useMsal>;

describe('useAuth', () => {
  const mockInstance = {
    acquireTokenSilent: jest.fn(),
    acquireTokenPopup: jest.fn(),
    loginPopup: jest.fn(),
    logoutPopup: jest.fn(),
  };

  const mockLogger = {
<<<<<<< HEAD
    info: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    verbose: jest.fn(),
    // Add any other methods if required by IMsalLogger
=======
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    trace: jest.fn(),
>>>>>>> origin/master
  };

  const mockAccount = {
    homeAccountId: 'test-account-id',
    environment: 'login.microsoftonline.com',
    tenantId: 'test-tenant-id',
    username: 'test@example.com',
    localAccountId: 'test-local-id',
    name: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMsal.mockReturnValue({
      instance: mockInstance as any,
      accounts: [],
      inProgress: 'none' as any,
      logger: mockLogger as any,
    });
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets authenticated state when accounts are present', async () => {
    mockUseMsal.mockReturnValue({
      instance: mockInstance as any,
      accounts: [mockAccount],
      inProgress: 'none' as any,
      logger: mockLogger as any,
    });
    mockInstance.acquireTokenSilent.mockResolvedValueOnce(mockAuthResponse);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.accessToken).toBe('mock-access-token');
    });
  });

  it('handles silent token acquisition failure with popup fallback', async () => {
    mockUseMsal.mockReturnValue({
      instance: mockInstance as any,
      accounts: [mockAccount],
      inProgress: 'none' as any,
      logger: mockLogger as any,
    });
<<<<<<< HEAD
=======

>>>>>>> origin/master
    mockInstance.acquireTokenSilent.mockRejectedValueOnce(
      new Error('Silent failed')
    );
    mockInstance.acquireTokenPopup.mockResolvedValueOnce(mockAuthResponse);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => {
      expect(result.current.accessToken).toBe('mock-access-token');
    });
    expect(mockInstance.acquireTokenSilent).toHaveBeenCalled();
    expect(mockInstance.acquireTokenPopup).toHaveBeenCalled();
  });

  it('handles complete token acquisition failure', async () => {
    mockUseMsal.mockReturnValue({
      instance: mockInstance as any,
      accounts: [mockAccount],
      inProgress: 'none' as any,
      logger: mockLogger as any,
    });
<<<<<<< HEAD
=======

>>>>>>> origin/master
    mockInstance.acquireTokenSilent.mockRejectedValueOnce(
      new Error('Silent failed')
    );
    mockInstance.acquireTokenPopup.mockRejectedValueOnce(
      new Error('Popup failed')
    );
<<<<<<< HEAD
=======

>>>>>>> origin/master
    const { result } = renderHook(() => useAuth());
    await waitFor(() => {
      expect(result.current.error).toBe(
        'Failed to acquire access token for Azure API'
      );
    });
  });

  it('handles login', async () => {
    const { result } = renderHook(() => useAuth());
    mockInstance.loginPopup.mockResolvedValueOnce(mockAuthResponse);
    await act(async () => {
      await result.current.login();
    });
    expect(mockInstance.loginPopup).toHaveBeenCalled();
  });

  it('handles login failure', async () => {
    const { result } = renderHook(() => useAuth());
    mockInstance.loginPopup.mockRejectedValueOnce(new Error('Login failed'));
    await act(async () => {
      await result.current.login();
    });
<<<<<<< HEAD
=======

>>>>>>> origin/master
    expect(result.current.error).toBe(
      'Authentication failed. Please try again.'
    );
  });

  it('handles logout', () => {
    mockUseMsal.mockReturnValue({
      instance: mockInstance as any,
      accounts: [mockAccount],
      inProgress: 'none' as any,
      logger: mockLogger as any,
    });
    const { result } = renderHook(() => useAuth());
    act(() => {
      result.current.logout();
    });
    expect(mockInstance.logoutPopup).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
  });

  it('clears error', () => {
    const { result } = renderHook(() => useAuth());
    // Set initial error
    act(() => {
      result.current.login();
    });
    // Clear error
    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });
<<<<<<< HEAD

  it('handles multiple accounts (table test)', async () => {
    const accountScenarios = [
      { accounts: [], expectedAuth: false },
      { accounts: [mockAccount], expectedAuth: true },
      {
        accounts: [
          mockAccount,
          { ...mockAccount, username: 'other@example.com' },
        ],
        expectedAuth: true,
      },
    ];
    for (const { accounts, expectedAuth } of accountScenarios) {
      mockUseMsal.mockReturnValue({
        instance: mockInstance as any,
        accounts,
        inProgress: 'none' as any,
        logger: mockLogger as any,
      });
      mockInstance.acquireTokenSilent.mockResolvedValueOnce(mockAuthResponse);
      const { result } = renderHook(() => useAuth());
      if (expectedAuth) {
        await waitFor(() => {
          expect(result.current.isAuthenticated).toBe(true);
        });
      } else {
        expect(result.current.isAuthenticated).toBe(false);
      }
    }
  });

  it('handles null/undefined MSAL instance gracefully', () => {
    mockUseMsal.mockReturnValue({
      // @ts-expect-error: purposely passing undefined
      instance: undefined,
      accounts: [],
      inProgress: 'none' as any,
      logger: mockLogger as any,
    });
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles unexpected errors in hooks', async () => {
    mockUseMsal.mockImplementation(() => {
      throw new Error('Unexpected');
    });
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
  });
=======
>>>>>>> origin/master
});
