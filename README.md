# Datadog Azure App Service Vending Machine

A GitHub-hosted "vending machine" UI for enabling Datadog APM on existing Azure App Services (Starting with .NET 8, Linux and Windows.

## Overview

This React application provides a streamlined interface for:
- Authenticating with Azure AD (multi-tenant)
- Selecting Azure subscriptions and App Services
- Configuring Datadog APM settings
- Deploying ARM templates to enable Datadog monitoring

## Features

- **Azure Authentication**: Multi-tenant Azure AD authentication using MSAL
- **Resource Discovery**: Automatically fetch and display Azure subscriptions and App Services
- **Platform Detection**: Automatically detect Windows vs Linux App Services
- **ARM Template Deployment**: Deploy appropriate ARM templates based on platform
- **Datadog Integration**: Configure Datadog site and API key settings
- **Modern UI**: Beautiful, responsive interface with loading states and error handling

## Prerequisites

1. **Azure AD App Registration**: You need to create an Azure AD app registration with the following settings:
   - **Platform**: Single-page application (SPA)
   - **Redirect URIs**: Your GitHub Pages URL (e.g., `https://yourusername.github.io/your-repo-name/`)
   - **API Permissions**: 
     - Azure Service Management - user_impersonation (delegated)
   - **Authentication**: Enable public client flows

2. **Azure Permissions**: Users must have appropriate permissions on Azure subscriptions to:
   - List subscriptions
   - List App Services
   - Deploy ARM templates

3. **Datadog API Key**: Users need a valid Datadog API key for their organization

## Authentication

This application supports **organizational accounts only** (work/school accounts from any Azure AD tenant). Personal Microsoft accounts are not supported.

📖 **For detailed authentication information, troubleshooting, and multi-tenant access:** See [AUTHENTICATION.md](./AUTHENTICATION.md)

### Quick Authentication Summary:
- ✅ **Supported**: Work/school accounts from any organization 
- ❌ **Not supported**: Personal Microsoft accounts (Outlook.com, Hotmail.com, etc.)
- 🌐 **Multi-tenant**: Users from external organizations can use this app
- 🔐 **Permissions required**: Azure subscription access with ARM template deployment rights

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd aas-apm-datadog-vending-machine
yarn install
```

### Check Peer Dependencies

This project uses Yarn 1.x (Classic). To check for peer dependency issues:

```bash
# Check peer dependencies
yarn check-peers

# Get solutions for peer dependency conflicts
yarn check-peers:solutions
```

For more details about peer dependency management in this project, see [PEER_DEPENDENCIES_GUIDE.md](./PEER_DEPENDENCIES_GUIDE.md).

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_CLIENT_ID=your-azure-ad-client-id
```

Replace `your-azure-ad-client-id` with your Azure AD app registration client ID.

### 3. Update Authentication Configuration

If needed, update the `src/authConfig.ts` file with your specific Azure AD configuration.

### 4. Development

```bash
yarn start
```

This runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it.

### 5. Build and Deploy

```bash
yarn build
yarn deploy
```

This builds the app for production and deploys it to GitHub Pages.

## Usage

1. **Sign In**: Click "Sign in with Azure" to authenticate with your Azure account
2. **Select Subscription**: Choose the Azure subscription containing your App Services
3. **Select App Service**: Choose the App Service or Function App to enable Datadog APM on
4. **Configure Datadog**: 
   - Select your Datadog site (US1, EU1, etc.)
   - Enter your Datadog API key
5. **Deploy**: Click "Enable Datadog APM" to deploy the ARM template

## Deployment

### GitHub Pages Setup

**⚠️ Critical**: GitHub Pages must be configured for GitHub Actions deployment.

1. **Repository Settings**:
   - Go to your repository → **Settings** → **Pages**
   - **Source**: Select **"GitHub Actions"** (NOT "Deploy from a branch")
   - Save settings

2. **Add GitHub Secret**:
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Add repository secret:
     - Name: `REACT_APP_CLIENT_ID`
     - Value: Your Azure AD application client ID

3. **Deploy**:
   ```bash
   git push origin master  # Triggers automatic deployment
   ```

4. **Access**: Your app will be available at:
   `https://yourusername.github.io/your-repo-name/`

### Troubleshooting Deployment

- **403 Permission Error**: Ensure Pages source is set to "GitHub Actions"
- **Build Failures**: Check Actions tab for detailed logs
- **404 Errors**: Wait a few minutes for deployment to propagate

## Architecture

### Components

- **DatadogAPMForm**: Main form component handling the entire workflow
- **LoadingSpinner**: Reusable loading indicator
- **ErrorAlert**: Error message display component

### Services

- **AzureService**: Handles all Azure Resource Manager API calls
- **authConfig**: MSAL authentication configuration

### ARM Templates

- **linux-appservice-datadog.json**: ARM template for Linux App Services
- **windows-appservice-datadog.json**: ARM template for Windows App Services (includes site extension)

## ARM Template Parameters

Both templates accept the following parameters:

- `siteName`: Name of the App Service
- `location`: Azure region
- `ddApiKey`: Datadog API key (secure string)
- `ddSite`: Datadog site (default: datadoghq.com)

## Environment Variables

The following environment variables are supported:

- `REACT_APP_CLIENT_ID`: Azure AD application client ID (required)

## Security Considerations

- API keys are handled securely and not logged
- Authentication tokens are stored in session storage
- ARM deployments use secure string parameters for sensitive data
- All API calls use HTTPS

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify your Azure AD app registration configuration
   - Check that redirect URIs match your deployment URL
   - Ensure proper API permissions are granted

2. **Permission Errors**
   - Verify the user has appropriate Azure RBAC permissions
   - Check that the user can access the selected subscription
   - Ensure ARM deployment permissions are available

3. **Deployment Failures**
   - Verify the Datadog API key is valid
   - Check that the App Service exists and is accessible
   - Review Azure Activity Log for detailed error messages

### Support

For issues with:
- **Azure integration**: Check Azure documentation and permissions
- **Datadog configuration**: Refer to [Datadog Azure App Services documentation](https://docs.datadoghq.com/serverless/azure_app_services/)
- **Application bugs**: Create an issue in this repository

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE.MD file for details.
