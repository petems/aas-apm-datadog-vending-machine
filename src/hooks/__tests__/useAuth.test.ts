
import { renderHook } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from '../../authConfig';

describe('useAuth', () => {
  it('returns expected auth state', () => {
    const wrapper = ({ children }) => (
      <MsalProvider instance={new PublicClientApplication(msalConfig)}>
        {children}
      </MsalProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current).toHaveProperty('accounts');
  });
});
