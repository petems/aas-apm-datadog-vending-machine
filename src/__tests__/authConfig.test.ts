import { msalConfig, loginRequest, armApiRequest } from '../authConfig';
import { LogLevel } from '@azure/msal-browser';

// Mock window.location for testing
const mockLocation = {
  origin: 'https://test.example.com',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('authConfig', () => {
  describe('msalConfig', () => {
    it('has correct auth configuration', () => {
      expect(msalConfig.auth.authority).toBe('https://login.microsoftonline.com/common');
      expect(msalConfig.auth.redirectUri).toBe(window.location.origin);
      expect(msalConfig.auth.postLogoutRedirectUri).toBe(window.location.origin);
    });

    it('uses CLIENT_ID from environment or fallback', () => {
      // Test with environment variable
      const originalEnv = process.env.REACT_APP_CLIENT_ID;
      process.env.REACT_APP_CLIENT_ID = 'test-client-id';
      
      // Re-import to get updated config
      jest.resetModules();
      const { msalConfig: updatedConfig } = require('../authConfig');
      expect(updatedConfig.auth.clientId).toBe('test-client-id');
      
      // Restore original environment
      process.env.REACT_APP_CLIENT_ID = originalEnv;
    });

    it('uses fallback client ID when environment variable is not set', () => {
      const originalEnv = process.env.REACT_APP_CLIENT_ID;
      delete process.env.REACT_APP_CLIENT_ID;
      
      jest.resetModules();
      const { msalConfig: updatedConfig } = require('../authConfig');
      expect(updatedConfig.auth.clientId).toBe('your-client-id-here');
      
      // Restore original environment
      process.env.REACT_APP_CLIENT_ID = originalEnv;
    });

    it('has correct cache configuration', () => {
          expect(msalConfig.cache?.cacheLocation).toBe('sessionStorage');
    expect(msalConfig.cache?.storeAuthStateInCookie).toBe(false);
    });

    it('has logger configuration with proper callback', () => {
      expect(msalConfig.system?.loggerOptions).toBeDefined();
      expect(typeof msalConfig.system?.loggerOptions?.loggerCallback).toBe('function');
    });

    it('logger callback handles different log levels correctly', () => {
      const loggerCallback = msalConfig.system?.loggerOptions?.loggerCallback;
      const consoleSpy = {
        error: jest.spyOn(console, 'error').mockImplementation(),
        info: jest.spyOn(console, 'info').mockImplementation(),
        debug: jest.spyOn(console, 'debug').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation(),
      };

      if (loggerCallback) {
        // Test that PII messages are ignored
        loggerCallback(LogLevel.Error, 'test message', true);
        expect(consoleSpy.error).not.toHaveBeenCalled();

        // Test different log levels
        loggerCallback(LogLevel.Error, 'error message', false);
        expect(consoleSpy.error).toHaveBeenCalledWith('error message');

        loggerCallback(LogLevel.Info, 'info message', false);
        expect(consoleSpy.info).toHaveBeenCalledWith('info message');

        loggerCallback(LogLevel.Verbose, 'debug message', false);
        expect(consoleSpy.debug).toHaveBeenCalledWith('debug message');

        loggerCallback(LogLevel.Warning, 'warning message', false);
        expect(consoleSpy.warn).toHaveBeenCalledWith('warning message');
      }

      // Restore console methods
      Object.values(consoleSpy).forEach(spy => spy.mockRestore());
    });
  });

  describe('loginRequest', () => {
    it('has correct scopes for Azure management', () => {
      expect(loginRequest.scopes).toEqual(['https://management.azure.com/user_impersonation']);
    });
  });

  describe('armApiRequest', () => {
    it('has correct scopes for ARM API access', () => {
      expect(armApiRequest.scopes).toEqual(['https://management.azure.com/user_impersonation']);
    });

    it('has same scopes as loginRequest', () => {
      expect(armApiRequest.scopes).toEqual(loginRequest.scopes);
    });
  });
});