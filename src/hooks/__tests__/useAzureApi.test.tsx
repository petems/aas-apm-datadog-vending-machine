
import { renderHook } from '@testing-library/react';
import { useAzureApi } from '../useAzureApi';

describe('useAzureApi', () => {
  it('returns expected methods', () => {
    const { result } = renderHook(() => useAzureApi());
    expect(typeof result.current.fetchAppServices).toBe('function');
  });
});
