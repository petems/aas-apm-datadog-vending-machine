import {
  isAzureSubscription,
  isAzureAppService,
  isDatadogSite,
  isValidDatadogApiKey,
  isValidSubscriptionId,
  isLinuxAppService,
  isWindowsAppService,
  extractResourceGroupFromId,
  validateSubscriptions,
  validateAppServices,
} from '../typeGuards';
import { mockSubscription, mockAppService, mockLinuxAppService } from '../../test-utils';

describe('typeGuards', () => {
  describe('isAzureSubscription', () => {
    it('returns true for valid Azure subscription', () => {
      expect(isAzureSubscription(mockSubscription)).toBe(true);
    });

    it('returns false for invalid objects', () => {
      expect(isAzureSubscription(null)).toBe(false);
      expect(isAzureSubscription(undefined)).toBe(false);
      expect(isAzureSubscription({})).toBe(false);
      expect(isAzureSubscription('string')).toBe(false);
      expect(isAzureSubscription([])).toBe(false);
    });

    it('returns false for objects missing required properties', () => {
      expect(isAzureSubscription({ subscriptionId: 'test' })).toBe(false);
      expect(isAzureSubscription({ 
        subscriptionId: 'test',
        displayName: 'test'
      })).toBe(false);
      expect(isAzureSubscription({ 
        subscriptionId: 'test',
        displayName: 'test',
        state: 'enabled'
      })).toBe(false);
    });

    it('returns false for objects with wrong property types', () => {
      expect(isAzureSubscription({
        subscriptionId: 123,
        displayName: 'test',
        state: 'enabled',
        tenantId: 'test'
      })).toBe(false);
    });
  });

  describe('isAzureAppService', () => {
    it('returns true for valid Azure app service', () => {
      expect(isAzureAppService(mockAppService)).toBe(true);
      expect(isAzureAppService(mockLinuxAppService)).toBe(true);
    });

    it('returns false for invalid objects', () => {
      expect(isAzureAppService(null)).toBe(false);
      expect(isAzureAppService(undefined)).toBe(false);
      expect(isAzureAppService({})).toBe(false);
      expect(isAzureAppService('string')).toBe(false);
    });

    it('returns false for objects missing required properties', () => {
      expect(isAzureAppService({ id: 'test' })).toBe(false);
      expect(isAzureAppService({ 
        id: 'test',
        name: 'test',
        resourceGroup: 'test',
        location: 'test',
        kind: 'app'
      })).toBe(false); // missing properties
    });

    it('returns false for objects with invalid properties structure', () => {
      expect(isAzureAppService({
        ...mockAppService,
        properties: null
      })).toBe(false);

      expect(isAzureAppService({
        ...mockAppService,
        properties: {
          hostNames: 'not-an-array',
          state: 'Running'
        }
      })).toBe(false);
    });
  });

  describe('isDatadogSite', () => {
    const validDatadogSite = { value: 'datadoghq.com', label: 'US1' };

    it('returns true for valid Datadog site', () => {
      expect(isDatadogSite(validDatadogSite)).toBe(true);
    });

    it('returns false for invalid objects', () => {
      expect(isDatadogSite(null)).toBe(false);
      expect(isDatadogSite(undefined)).toBe(false);
      expect(isDatadogSite({})).toBe(false);
      expect(isDatadogSite({ value: 'test' })).toBe(false);
      expect(isDatadogSite({ label: 'test' })).toBe(false);
    });

    it('returns false for objects with wrong property types', () => {
      expect(isDatadogSite({ value: 123, label: 'test' })).toBe(false);
      expect(isDatadogSite({ value: 'test', label: 123 })).toBe(false);
    });
  });

  describe('isValidDatadogApiKey', () => {
    it('returns true for valid Datadog API keys', () => {
      expect(isValidDatadogApiKey('abcdef1234567890abcdef1234567890')).toBe(true);
      expect(isValidDatadogApiKey('ABCDEF1234567890ABCDEF1234567890')).toBe(true);
      expect(isValidDatadogApiKey('1234567890abcdef1234567890abcdef')).toBe(true);
    });

    it('returns false for invalid API keys', () => {
      expect(isValidDatadogApiKey('')).toBe(false);
      expect(isValidDatadogApiKey('too-short')).toBe(false);
      expect(isValidDatadogApiKey('abcdef1234567890abcdef12345678901')).toBe(false); // too long
      expect(isValidDatadogApiKey('abcdef1234567890abcdef123456789g')).toBe(false); // invalid character
      expect(isValidDatadogApiKey('abcdef1234567890abcdef123456789-')).toBe(false); // invalid character
    });
  });

  describe('isValidSubscriptionId', () => {
    it('returns true for valid Azure subscription IDs (UUIDs)', () => {
      expect(isValidSubscriptionId('12345678-1234-1234-1234-123456789abc')).toBe(true);
      expect(isValidSubscriptionId('ABCDEF12-3456-7890-ABCD-EF1234567890')).toBe(true);
      expect(isValidSubscriptionId('a1b2c3d4-e5f6-1234-8901-23456789abcd')).toBe(true);
    });

    it('returns false for invalid subscription IDs', () => {
      expect(isValidSubscriptionId('')).toBe(false);
      expect(isValidSubscriptionId('not-a-uuid')).toBe(false);
      expect(isValidSubscriptionId('12345678-1234-1234-1234')).toBe(false); // too short
      expect(isValidSubscriptionId('12345678-1234-1234-1234-123456789abcde')).toBe(false); // too long
      expect(isValidSubscriptionId('12345678-1234-1234-1234-123456789abg')).toBe(false); // invalid character
    });
  });

  describe('isLinuxAppService', () => {
    it('returns true for Linux app services', () => {
      expect(isLinuxAppService(mockLinuxAppService)).toBe(true);
      
      const linuxAppByKind = {
        ...mockAppService,
        kind: 'app,linux'
      };
      expect(isLinuxAppService(linuxAppByKind)).toBe(true);
    });

    it('returns false for Windows app services', () => {
      expect(isLinuxAppService(mockAppService)).toBe(false);
    });
  });

  describe('isWindowsAppService', () => {
    it('returns true for Windows app services', () => {
      expect(isWindowsAppService(mockAppService)).toBe(true);
    });

    it('returns false for Linux app services', () => {
      expect(isWindowsAppService(mockLinuxAppService)).toBe(false);
    });
  });

  describe('extractResourceGroupFromId', () => {
    it('extracts resource group from valid Azure resource ID', () => {
      const resourceId = '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/my-rg/providers/Microsoft.Web/sites/my-app';
      expect(extractResourceGroupFromId(resourceId)).toBe('my-rg');
    });

    it('returns null for invalid resource IDs', () => {
      expect(extractResourceGroupFromId('')).toBe(null);
      expect(extractResourceGroupFromId('invalid-id')).toBe(null);
      expect(extractResourceGroupFromId('/subscriptions/12345/providers/Microsoft.Web/sites/my-app')).toBe(null);
    });

    it('handles resource IDs with different providers', () => {
      const storageId = '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/storage-rg/providers/Microsoft.Storage/storageAccounts/mystorage';
      expect(extractResourceGroupFromId(storageId)).toBe('storage-rg');
    });
  });

  describe('validateSubscriptions', () => {
    it('filters out invalid subscriptions', () => {
      const mixedArray = [
        mockSubscription,
        { invalid: 'object' },
        null,
        { subscriptionId: 'valid', displayName: 'valid', state: 'enabled', tenantId: 'valid' },
        'string',
        undefined
      ];

      const result = validateSubscriptions(mixedArray);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockSubscription);
      expect(result[1]).toEqual({
        subscriptionId: 'valid',
        displayName: 'valid',
        state: 'enabled',
        tenantId: 'valid'
      });
    });

    it('returns empty array for all invalid subscriptions', () => {
      const invalidArray = [null, undefined, 'string', { invalid: 'object' }];
      expect(validateSubscriptions(invalidArray)).toEqual([]);
    });

    it('returns all valid subscriptions unchanged', () => {
      const validArray = [mockSubscription];
      expect(validateSubscriptions(validArray)).toEqual(validArray);
    });
  });

  describe('validateAppServices', () => {
    it('filters out invalid app services', () => {
      const mixedArray = [
        mockAppService,
        mockLinuxAppService,
        { invalid: 'object' },
        null,
        'string'
      ];

      const result = validateAppServices(mixedArray);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockAppService);
      expect(result[1]).toEqual(mockLinuxAppService);
    });

    it('returns empty array for all invalid app services', () => {
      const invalidArray = [null, undefined, 'string', { invalid: 'object' }];
      expect(validateAppServices(invalidArray)).toEqual([]);
    });

    it('returns all valid app services unchanged', () => {
      const validArray = [mockAppService, mockLinuxAppService];
      expect(validateAppServices(validArray)).toEqual(validArray);
    });
  });
});