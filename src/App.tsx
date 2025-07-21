import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// import { PublicClientApplication } from '@azure/msal-browser'; // REMOVED: MSAL dependency
// import { MsalProvider } from '@azure/msal-react'; // REMOVED: MSAL dependency
// import { msalConfig } from './authConfig'; // REMOVED: MSAL dependency
import DatadogAPMForm from './components/DatadogAPMForm';
import DatadogConfigPage from './components/DatadogConfigPage';
import './App.css';

// Initialize MSAL instance
// const msalInstance = new PublicClientApplication(msalConfig); // REMOVED: MSAL dependency

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 401 errors
        if (
          error &&
          typeof error === 'object' &&
          'status' in error &&
          error.status === 401
        ) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 mb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center space-x-8">
          <Link
            to="/"
            className={`py-4 px-3 text-sm font-medium border-b-2 transition duration-200 ${
              location.pathname === '/'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Home
          </Link>
          <Link
            to="/arm-template"
            className={`py-4 px-3 text-sm font-medium border-b-2 transition duration-200 ${
              location.pathname === '/arm-template'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ARM Template Deployment
          </Link>
          <Link
            to="/direct-config"
            className={`py-4 px-3 text-sm font-medium border-b-2 transition duration-200 ${
              location.pathname === '/direct-config'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Direct Configuration
          </Link>
        </div>
      </div>
    </nav>
  );
};

const LandingPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          🐕 Datadog APM
        </h1>
        <h2 className="text-3xl font-semibold text-gray-700 mb-4">
          Azure Vending Machine
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Choose your preferred method to enable Datadog Application Performance
          Monitoring on your Azure App Services. We provide multiple approaches
          to fit your workflow.
        </p>
      </div>

      {/* Configuration Options */}
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {/* ARM Template Option */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 hover:shadow-xl transition duration-300 opacity-75">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚧</span>
            </div>
            <div className="flex items-center justify-center space-x-2 mb-2">
              <h3 className="text-2xl font-bold text-gray-900">
                ARM Template Deployment
              </h3>
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                UNDER CONSTRUCTION
              </span>
            </div>
            <p className="text-gray-600">
              Automated infrastructure-as-code approach
            </p>
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm font-medium">
                ⚠️ Currently Not Recommended
              </p>
              <p className="text-red-600 text-xs mt-1">
                Complex permissions and authentication issues
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start space-x-3">
              <span className="text-green-500 text-lg">✅</span>
              <span className="text-gray-700">
                Uses Azure Resource Manager templates
              </span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-yellow-500 text-lg">⚠️</span>
              <span className="text-gray-700">
                Automated authentication via Azure MSAL
              </span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-green-500 text-lg">✅</span>
              <span className="text-gray-700">
                Infrastructure-as-code deployment
              </span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-yellow-500 text-lg">⚠️</span>
              <span className="text-gray-700">
                Best for production environments
              </span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-red-500 text-lg">❌</span>
              <span className="text-gray-700">
                Complex Azure permissions required
              </span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-red-500 text-lg">❌</span>
              <span className="text-gray-700">
                Authentication challenges in current implementation
              </span>
            </div>
          </div>

          <Link
            to="/arm-template"
            className="w-full bg-yellow-600 text-white py-3 px-6 rounded-md hover:bg-yellow-700 transition duration-200 flex items-center justify-center font-medium"
          >
            View Under Construction (Not Recommended)
          </Link>
        </div>

        {/* Direct Configuration Option */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-green-200 hover:shadow-xl transition duration-300 ring-2 ring-green-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚡</span>
            </div>
            <div className="flex items-center justify-center space-x-2 mb-2">
              <h3 className="text-2xl font-bold text-gray-900">
                Direct Configuration
              </h3>
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                RECOMMENDED
              </span>
            </div>
            <p className="text-gray-600">
              Manual token-based REST API approach
            </p>
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700 text-sm font-medium">
                ✅ Fully Functional & Tested
              </p>
              <p className="text-green-600 text-xs mt-1">
                Simple setup with Azure CLI tokens
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start space-x-3">
              <span className="text-green-500 text-lg">✅</span>
              <span className="text-gray-700">
                Uses Azure CLI access tokens
              </span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-green-500 text-lg">✅</span>
              <span className="text-gray-700">
                Direct REST API calls to Azure
              </span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-green-500 text-lg">✅</span>
              <span className="text-gray-700">
                Fetch and preview current settings
              </span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-green-500 text-lg">✅</span>
              <span className="text-gray-700">
                More control and transparency
              </span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-blue-500 text-lg">ℹ️</span>
              <span className="text-gray-700">
                Requires Azure CLI token generation
              </span>
            </div>
          </div>

          <Link
            to="/direct-config"
            className="w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 transition duration-200 flex items-center justify-center font-medium"
          >
            Use Direct Configuration
          </Link>
        </div>
      </div>

      {/* Getting Started Section */}
      <div className="bg-gray-50 rounded-lg p-8 mb-12">
        <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          🚀 Getting Started
        </h3>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Before You Begin
            </h4>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start space-x-2">
                <span>•</span>
                <span>Azure subscription with App Service resources</span>
              </li>
              <li className="flex items-start space-x-2">
                <span>•</span>
                <span>Datadog account and API key</span>
              </li>
              <li className="flex items-start space-x-2">
                <span>•</span>
                <span>Azure CLI installed and authenticated</span>
              </li>
              <li className="flex items-start space-x-2">
                <span>•</span>
                <span>
                  Appropriate Azure RBAC permissions for your App Service
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Recommended Approach
            </h4>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <div className="flex items-start space-x-2">
                <span className="text-green-600">⚡</span>
                <div>
                  <span className="font-semibold text-green-800">
                    Direct Configuration
                  </span>
                  <p className="text-green-700 text-sm mt-1">
                    Simple, reliable, and fully functional. Uses Azure CLI
                    tokens for direct API access.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <span className="text-yellow-600">🚧</span>
                <div>
                  <span className="font-semibold text-yellow-800">
                    ARM Template
                  </span>
                  <p className="text-yellow-700 text-sm mt-1">
                    Currently under construction due to authentication
                    complexities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Built with React + TypeScript + Azure REST APIs •
          <a
            href="https://docs.datadoghq.com/serverless/azure_app_services/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-blue-600 hover:text-blue-800"
          >
            Datadog Azure Documentation
          </a>
          •
          <a
            href="https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-blue-600 hover:text-blue-800"
          >
            ARM Templates Documentation
          </a>
        </p>
      </div>
    </div>
  );
};

const ARMTemplatePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Warning Banner */}
      <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-2xl">🚧</span>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-800">
              Under Construction - Not Recommended for Use
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p className="mb-2">
                This ARM Template deployment method is currently experiencing
                significant issues:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Complex Azure RBAC permission requirements</li>
                <li>Azure MSAL authentication challenges</li>
                <li>Inconsistent deployment reliability</li>
                <li>Difficult troubleshooting for permission errors</li>
              </ul>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-800 font-medium">
                  👉 We strongly recommend using the
                  <Link
                    to="/direct-config"
                    className="text-blue-600 hover:text-blue-800 underline mx-1"
                  >
                    Direct Configuration method
                  </Link>
                  instead, which is fully functional and easier to use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          🚧 ARM Template Deployment
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          <span className="line-through opacity-60">
            Quickly enable Datadog Application Performance Monitoring on your
            Azure App Services with automated ARM template deployments.
          </span>
        </p>
        <div className="mt-4 inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
          <span className="mr-2">⚠️</span>
          Currently Under Development - Use at Your Own Risk
        </div>
      </div>

      {/* Development Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          🔧 For Developers Only
        </h3>
        <p className="text-blue-800 text-sm">
          The form below is available for development and testing purposes only.
          It may not work as expected due to the authentication and permissions
          issues mentioned above.
        </p>
      </div>

      {/* Main Form */}
      <div className="opacity-75">
        <DatadogAPMForm />
      </div>

      {/* Footer */}
      <div className="text-center mt-12 text-sm text-gray-500">
        <p>
          ⚠️ ARM Template deployment currently has known issues •
          <a
            href="https://docs.datadoghq.com/serverless/azure_app_services/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-blue-600 hover:text-blue-800"
          >
            Datadog Azure Documentation
          </a>
          •
          <Link
            to="/direct-config"
            className="ml-1 text-green-600 hover:text-green-800 font-medium"
          >
            Try Direct Configuration Instead
          </Link>
        </p>
      </div>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* <MsalProvider instance={msalInstance}> REMOVED: MSAL dependency */}
        <Router>
          <div className="App">
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
              <Navigation />

              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/arm-template" element={<ARMTemplatePage />} />
                <Route path="/direct-config" element={<DatadogConfigPage />} />
              </Routes>
            </div>
          </div>
        </Router>
      {/* </MsalProvider> REMOVED: MSAL dependency */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
