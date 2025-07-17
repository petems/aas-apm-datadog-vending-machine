import React from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './authConfig';
import DatadogAPMForm from './components/DatadogAPMForm';
import './App.css';

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <div className="App">
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-gray-900 mb-4">
                🐕 Datadog APM
              </h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                Azure Vending Machine
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Quickly enable Datadog Application Performance Monitoring on
                your Azure App Services with automated ARM template deployments.
              </p>
            </div>

            {/* Main Form */}
            <DatadogAPMForm />

            {/* Footer */}
            <div className="text-center mt-12 text-sm text-gray-500">
              <p>
                Built with React + TypeScript + Azure MSAL •
                <a
                  href="https://docs.datadoghq.com/serverless/azure_app_services/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  Datadog Azure Documentation
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </MsalProvider>
  );
}

export default App;
