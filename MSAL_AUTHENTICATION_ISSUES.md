# MSAL Authentication Issues - Current Status

## Overview

The DatadogAPMForm component has been temporarily disabled due to significant challenges with MSAL (Microsoft Authentication Library) authentication in hosted multi-tenant Azure AD environments.

## Problem Statement

### Multi-Tenant Application Challenges

When deployed to hosting platforms (GitHub Pages, Vercel, Netlify, etc.), the application faces several critical issues:

1. **Untrusted Application Status**: Azure AD considers hosted applications as "untrusted" by default
2. **Publisher Domain Verification**: Production apps require verified publisher domains
3. **Redirect URI Restrictions**: Strict requirements for exact domain matching
4. **CORS Limitations**: Cross-origin requests to Azure AD endpoints are heavily restricted

### Technical Limitations

- **Token Acquisition Failures**: Silent token acquisition fails in untrusted contexts
- **Popup/Redirect Issues**: Authentication flows are blocked or unreliable
- **Session Management**: MSAL session persistence doesn't work reliably across domains
- **Browser Security**: Modern browsers block authentication popups from untrusted domains

## Attempted Solutions

### 1. Publisher Domain Verification
- **Challenge**: Required verified domain ownership
- **Attempt**: GitHub Pages domain verification
- **Result**: Complex setup, still considered untrusted

### 2. Service Principal Authentication
- **Challenge**: Requires storing credentials in client-side code
- **Security Risk**: Credentials exposed in browser
- **Result**: Not suitable for production

### 3. Managed Identity
- **Challenge**: Only works within Azure environment
- **Limitation**: Cannot be used for external hosting
- **Result**: Not applicable for this use case

### 4. API Gateway Pattern
- **Challenge**: Adds complexity and potential security vulnerabilities
- **Overhead**: Requires backend infrastructure
- **Result**: Overkill for this application

## Current Status

### What's Been Removed
- MSAL authentication logic from DatadogAPMForm
- Azure AD application registration dependencies
- Token acquisition and management code
- Session persistence logic

### What Remains
- AzureService class (used by other components)
- DatadogConfigPage component (alternative implementation)
- LoadingSpinner and ErrorAlert components
- Type definitions and utilities

## Alternative Approaches Under Consideration

### 1. Azure CLI-Based Authentication
- **Pros**: Works reliably in hosted environments
- **Cons**: Requires user to have Azure CLI installed
- **Implementation**: Use `@azure/msal-node` with device code flow

### 2. Backend API Gateway
- **Pros**: Secure token handling, full control
- **Cons**: Additional infrastructure required
- **Implementation**: Azure Functions or similar serverless backend

### 3. Azure Static Web Apps
- **Pros**: Built-in authentication, Azure-native
- **Cons**: Platform lock-in
- **Implementation**: Migrate to Azure Static Web Apps

### 4. Service Principal with Secure Storage
- **Pros**: Reliable authentication
- **Cons**: Security concerns, credential management
- **Implementation**: Use Azure Key Vault for credential storage

## Next Steps

1. **Evaluate Azure CLI approach** - Most promising for immediate solution
2. **Implement device code flow** - Works well in hosted environments
3. **Add secure credential handling** - If service principal approach is chosen
4. **Consider backend migration** - For long-term solution

## Related Files

- `src/components/DatadogAPMForm.tsx` - Currently shows under construction message
- `src/components/DatadogConfigPage.tsx` - Alternative implementation using different auth
- `src/services/azureService.ts` - Azure API service (still functional)
- `src/authConfig.ts` - MSAL configuration (commented out)

## References

- [MSAL Browser Limitations](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-browser-limitations)
- [Azure AD App Registration Best Practices](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-app-registration-best-practices)
- [Multi-Tenant Application Patterns](https://docs.microsoft.com/en-us/azure/active-directory/develop/single-and-multi-tenant-apps) 