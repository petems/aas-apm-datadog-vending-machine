import React from 'react';

/**
 * 🚧 UNDER CONSTRUCTION 🚧
 * 
 * This component is temporarily disabled due to significant challenges with MSAL (Microsoft Authentication Library)
 * authentication in hosted multi-tenant Azure AD environments.
 * 
 * ## MSAL Authentication Challenges
 * 
 * ### Multi-Tenant Application Issues
 * - **Untrusted Application Status**: When deployed to hosting platforms (GitHub Pages, Vercel, etc.), 
 *   the application is considered "untrusted" by Azure AD
 * - **Publisher Domain Verification**: Azure AD requires verified publisher domains for production apps,
 *   which is complex to achieve for hosted applications
 * - **Redirect URI Restrictions**: Azure AD has strict requirements for redirect URIs that must match
 *   the application's domain exactly
 * 
 * ### Technical Limitations
 * - **CORS Restrictions**: Cross-origin requests to Azure AD endpoints are heavily restricted
 * - **Token Acquisition**: Silent token acquisition fails in untrusted contexts
 * - **Popup/Redirect Issues**: Authentication flows are blocked or unreliable in hosted environments
 * - **Session Management**: MSAL session persistence doesn't work reliably across domains
 * 
 * ### Alternative Approaches Considered
 * - **Service Principal Authentication**: Requires storing credentials (security risk)
 * - **Managed Identity**: Only works within Azure environment
 * - **API Gateway Pattern**: Adds complexity and potential security vulnerabilities
 * - **Desktop Application Flow**: Not suitable for web applications
 * 
 * ### Current Status
 * The authentication layer has been removed and the component is being redesigned to use
 * alternative authentication methods that work reliably in hosted environments.
 * 
 * ### Next Steps
 * 1. Implement Azure CLI-based authentication flow
 * 2. Use Azure SDK for JavaScript with service principal credentials
 * 3. Consider implementing a backend API gateway for secure token handling
 * 4. Explore Azure Static Web Apps with built-in authentication
 */

const DatadogAPMForm: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🚧</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Under Construction
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          This component is being redesigned to address MSAL authentication challenges
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Authentication System Redesign Required
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                The original MSAL-based authentication system has been removed due to compatibility 
                issues with hosted multi-tenant Azure AD applications.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Challenges Faced</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Untrusted application status in hosted environments</li>
            <li>• Publisher domain verification requirements</li>
            <li>• CORS restrictions on Azure AD endpoints</li>
            <li>• Token acquisition failures in untrusted contexts</li>
            <li>• Session management issues across domains</li>
          </ul>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alternative Approaches</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Azure CLI-based authentication flow</li>
            <li>• Service principal with secure credential handling</li>
            <li>• Backend API gateway for token management</li>
            <li>• Azure Static Web Apps integration</li>
            <li>• Managed identity (Azure-only)</li>
          </ul>
        </div>
      </div>

      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Technical Details</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>Multi-Tenant Application Issues:</strong> When deployed to hosting platforms, 
            the application is considered "untrusted" by Azure AD, causing authentication flows to fail.
          </p>
          <p>
            <strong>Publisher Domain Verification:</strong> Azure AD requires verified publisher domains 
            for production apps, which is complex to achieve for hosted applications without a custom domain.
          </p>
          <p>
            <strong>Redirect URI Restrictions:</strong> Azure AD has strict requirements for redirect URIs 
            that must match the application's domain exactly, making development and deployment challenging.
          </p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Expected completion: TBC
        </p>
      </div>
    </div>
  );
};

export default DatadogAPMForm;
