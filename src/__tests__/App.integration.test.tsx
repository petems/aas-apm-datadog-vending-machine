import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Simplified react-router-dom mocks for unit testing
jest.mock('react-router-dom', () => ({
  HashRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: () => <div />,
}));

// Mock the DatadogAPMForm component since we test it separately
jest.mock('../components/DatadogAPMForm', () => {
  return function MockDatadogAPMForm() {
    return <div data-testid="datadog-apm-form">Datadog APM Form</div>;
  };
});

describe('App', () => {
  it('renders main heading and description', () => {
    render(<App />);
    
    expect(screen.getByRole('heading', { name: /🐕 datadog apm/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /azure vending machine/i })).toBeInTheDocument();
    expect(screen.getByText(/quickly enable datadog application performance monitoring/i)).toBeInTheDocument();
  });

  it('renders the main form component', () => {
    render(<App />);
    
    expect(screen.getByTestId('datadog-apm-form')).toBeInTheDocument();
  });

  it('renders footer with documentation link', () => {
    render(<App />);
    
    const docLink = screen.getByRole('link', { name: /datadog azure documentation/i });
    expect(docLink).toBeInTheDocument();
    expect(docLink).toHaveAttribute('href', 'https://docs.datadoghq.com/serverless/azure_app_services/');
    expect(docLink).toHaveAttribute('target', '_blank');
    expect(docLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('has proper semantic structure', () => {
    render(<App />);
    
    // Check for main container
    const appDiv = screen.getByText(/🐕 datadog apm/i).closest('.App');
    expect(appDiv).toBeInTheDocument();
    
    // Check for proper layout classes
    expect(screen.getByText(/quickly enable datadog/i).closest('.max-w-2xl')).toBeInTheDocument();
  });

  it('renders with proper accessibility structure', () => {
    render(<App />);
    
    // Check that headings are properly structured
    const h1 = screen.getByRole('heading', { level: 1 });
    const h2 = screen.getByRole('heading', { level: 2 });
    
    expect(h1).toHaveTextContent('🐕 Datadog APM');
    expect(h2).toHaveTextContent('Azure Vending Machine');
  });
});