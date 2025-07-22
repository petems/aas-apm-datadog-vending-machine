import { renderHook } from '@testing-library/react';
import { useAuth } from '../useAuth';

describe('useAuth placeholder', () => {
  it('returns default values', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
