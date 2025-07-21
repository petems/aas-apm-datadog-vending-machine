// REMOVED: MSAL dependency - entire file commented out
/*
import { useState, useEffect, useCallback } from 'react';
// import { useMsal } from '@azure/msal-react'; // REMOVED: MSAL dependency
import { loginRequest, armApiRequest } from '../authConfig';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    accessToken: null,
    isLoading: false,
    error: null,
  });

  let instance: any = null;
  let accounts: any = [];
  let msalError = false;

  try {
    const msalData = useMsal();
    instance = msalData.instance;
    accounts = msalData.accounts;
  } catch (error) {
    console.error('MSAL initialization error:', error);
    msalError = true;
  }

  const acquireToken = useCallback(async () => {
    if (msalError || !instance || accounts.length === 0) return;

    const firstAccount = accounts[0];
    if (!firstAccount) return;

    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Try silent token acquisition first
      const response = await instance.acquireTokenSilent({
        ...armApiRequest,
        account: firstAccount,
      });

      setAuthState(prev => ({
        ...prev,
        accessToken: response.accessToken,
        isLoading: false,
      }));
    } catch (error) {
      console.warn('Silent token acquisition failed, trying popup', error);

      try {
        // Fallback to popup
        const response = await instance.acquireTokenPopup(armApiRequest);
        setAuthState(prev => ({
          ...prev,
          accessToken: response.accessToken,
          isLoading: false,
        }));
      } catch (popupError) {
        console.error('Token acquisition failed', popupError);
        setAuthState(prev => ({
          ...prev,
          error: 'Failed to acquire access token for Azure API',
          isLoading: false,
        }));
      }
    }
  }, [instance, accounts, msalError]);

  // Check if user is authenticated
  useEffect(() => {
    if (!msalError && accounts.length > 0) {
      setAuthState(prev => ({ ...prev, isAuthenticated: true }));
      acquireToken();
    }
  }, [accounts, acquireToken, msalError]);

  const login = useCallback(async () => {
    if (msalError || !instance) {
      setAuthState(prev => ({
        ...prev,
        error: 'MSAL not available. Please refresh the page.',
        isLoading: false,
      }));
      return;
    }

    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error('Login failed', error);
      setAuthState(prev => ({
        ...prev,
        error: 'Authentication failed. Please try again.',
        isLoading: false,
      }));
    }
  }, [instance, msalError]);

  const logout = useCallback(() => {
    if (instance) {
      instance.logoutPopup();
    }
    setAuthState(prev => ({ ...prev, isAuthenticated: false, accessToken: null, isLoading: false, error: null }));
  }, [instance]);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...authState,
    login,
    logout,
    clearError,
    refreshToken: acquireToken,
  };
};
*/

// Placeholder hook that returns default values
export const useAuth = () => ({
  isAuthenticated: false,
  accessToken: null,
  isLoading: false,
  error: null,
  login: async () => {},
  logout: () => {},
  clearError: () => {},
  refreshToken: async () => {},
});
