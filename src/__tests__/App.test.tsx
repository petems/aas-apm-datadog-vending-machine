
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from '../../authConfig';

describe('App component', () => {
  it('renders without crashing', () => {
    const msalInstance = new PublicClientApplication(msalConfig);
    render(
      <MsalProvider instance={msalInstance}>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </MsalProvider>
    );
  });
});
