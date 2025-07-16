# Datadog APM Azure Vending Machine - Setup Guide

This guide will walk you through setting up the complete Datadog APM Azure vending machine application.

## 🚀 Quick Start

### Step 1: Azure AD App Registration

Choose one of the following methods to create the Azure AD App Registration:

#### Option A: Terraform (Recommended)

##### Quick Deploy with Azure Cloud Shell

Click the button below to open this repository in Azure Cloud Shell and deploy automatically:

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://shell.azure.com/bash?resource=https://github.com/peter-souter/azure-app-services-for-datadog-vending-machine)

This will:
- Open Azure Cloud Shell in your browser
- Clone this repository
- Navigate to the terraform directory
- Have Terraform and GitHub CLI pre-installed and ready to use

After clicking the button, run these commands in Azure Cloud Shell:
```bash
cd azure-app-services-for-datadog-vending-machine/terraform
terraform init
cp terraform.tfvars.example terraform.tfvars
# Edit the terraform.tfvars file with your redirect URIs
code terraform.tfvars
# Then deploy
terraform plan
terraform apply
```

##### Local Development Setup

1. **Prerequisites**: Install [Terraform](https://terraform.io/downloads) and [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)

2. **Authenticate with Azure**:
   ```bash
   az login
   ```

3. **Configure Terraform**:
   ```bash
   cd terraform
   terraform init
   cp terraform.tfvars.example terraform.tfvars
   ```

4. **Edit terraform.tfvars** with your configuration:
   ```hcl
   redirect_uris = [
     "https://yourusername.github.io/your-repo-name/",
     "http://localhost:3000"
   ]
   
   # Enable automatic GitHub configuration (optional)
   create_github_secret = true
   github_owner         = "yourusername"
   github_repository    = "your-repo-name"
   ```

5. **Set GitHub Token** (if using GitHub integration):
   ```bash
   # Install GitHub CLI if needed: brew install gh
   gh auth login --scopes repo
   export GITHUB_TOKEN=$(gh auth token)
   ```

6. **Deploy the App Registration**:
   ```bash
   terraform plan
   terraform apply
   ```

7. **Done!** If GitHub integration is enabled, the `REACT_APP_CLIENT_ID` is automatically added to your repository secrets

#### Option B: Manual Setup (Azure Portal)

1. Go to the [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click "New registration"
3. Configure the app registration:
   - **Name**: `Datadog APM Vending Machine`
   - **Supported account types**: Accounts in any organizational directory (Any Azure AD directory - Multitenant)
   - **Redirect URI**: 
     - Type: Single-page application (SPA)
     - URI: `https://yourusername.github.io/your-repo-name/` (replace with your GitHub Pages URL)

4. After creation, go to **API permissions**:
   - Click "Add a permission"
   - Select "Azure Service Management"
   - Select "Delegated permissions"
   - Check "user_impersonation"
   - Click "Add permissions"
   - Click "Grant admin consent" (if you have admin rights)

5. Go to **Authentication**:
   - Under "Implicit grant and hybrid flows", check both:
     - ✅ Access tokens (used for implicit flows)
     - ✅ ID tokens (used for implicit and hybrid flows)

6. Copy the **Application (client) ID** - you'll need this for configuration

### Step 2: Fork and Configure the Repository

1. Fork this repository to your GitHub account
2. Clone your forked repository:
   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   cd your-repo-name
   ```

3. Install dependencies:
   ```bash
   yarn install
   ```

4. Create environment configuration:
   ```bash
   cp .env.example .env
   ```

5. Edit the `.env` file and add your Azure AD client ID:
   ```env
   REACT_APP_CLIENT_ID=your-azure-ad-client-id-here
   ```

### Step 3: Test Locally

1. Start the development server:
   ```bash
   yarn start
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser
3. Test the authentication flow:
   - Click "Sign in with Azure"
   - Authenticate with your Azure account
   - Verify that subscriptions load correctly

### Step 4: Deploy to GitHub Pages

#### Option A: Automatic Deployment (Recommended)

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add a new repository secret:
   - **Name**: `REACT_APP_CLIENT_ID`
   - **Value**: Your Azure AD application client ID

3. Go to Settings → Pages
   - **Source**: Deploy from a branch
   - **Branch**: `gh-pages` (will be created automatically)

4. Push your changes to the main branch:
   ```bash
   git add .
   git commit -m "Initial setup with Azure AD configuration"
   git push origin main
   ```

5. The GitHub Action will automatically build and deploy your app
6. Your app will be available at: `https://yourusername.github.io/your-repo-name/`

#### Option B: Manual Deployment

1. Build the application:
   ```bash
   yarn build
   ```

2. Deploy to GitHub Pages:
   ```bash
   yarn deploy
   ```

### Step 5: Update Azure AD Redirect URI

After deployment, update your Azure AD app registration:

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Find your app registration
3. Go to Authentication
4. Update the redirect URI to match your GitHub Pages URL:
   - `https://yourusername.github.io/your-repo-name/`

## 🔧 Configuration

### Environment Variables

- `REACT_APP_CLIENT_ID`: Your Azure AD application client ID (required)

### ARM Templates

The application includes two ARM templates in the `public/arm/` directory:
- `linux-appservice-datadog.json`: For Linux App Services
- `windows-appservice-datadog.json`: For Windows App Services (includes Datadog site extension)

### Supported Datadog Sites

- US1: datadoghq.com
- EU1: datadoghq.eu
- US3: us3.datadoghq.com
- US5: us5.datadoghq.com
- AP1: ap1.datadoghq.com

## 🛡️ Security Notes

1. **API Keys**: Never commit Datadog API keys to your repository
2. **Environment Variables**: Use GitHub Secrets for sensitive configuration
3. **CORS**: The application uses MSAL for secure Azure authentication
4. **HTTPS**: Always deploy to HTTPS endpoints (GitHub Pages provides this by default)

## 🧪 Testing

### Prerequisites for Testing

To test the application, you need:

1. **Azure Subscription**: With App Services to test on
2. **Azure Permissions**: 
   - Subscription Reader (minimum)
   - Resource Group Contributor (for deployments)
   - App Service Contributor (for deployments)
3. **Datadog Account**: With a valid API key

### Test Workflow

1. Sign in to the application
2. Select a test subscription
3. Choose a test App Service
4. Enter your Datadog API key
5. Select the appropriate Datadog site
6. Click "Enable Datadog APM"
7. Monitor the deployment in the Azure Portal

## 🐛 Troubleshooting

### Common Issues

**Authentication Fails**
- Verify the client ID is correct
- Check that redirect URIs match exactly
- Ensure the app registration has proper API permissions

**No Subscriptions Appear**
- Verify the user has access to Azure subscriptions
- Check that API permissions are granted and consented
- Look for errors in browser developer console

**No App Services Listed**
- Ensure the subscription contains App Services or Function Apps
- Check that the user has Reader permissions on the subscription
- Verify the selected subscription is active

**Deployment Fails**
- Verify the Datadog API key is valid
- Check that the user has Contributor permissions on the resource group
- Review the Azure Activity Log for detailed error messages

### Debug Mode

Enable debug logging by setting:
```env
REACT_APP_DEBUG=true
```

This will output additional information to the browser console.

## 📚 Additional Resources

- [Azure AD App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Datadog Azure App Services Documentation](https://docs.datadoghq.com/serverless/azure_app_services/)
- [GitHub Pages Deployment](https://docs.github.com/en/pages)
- [React Documentation](https://reactjs.org/docs/getting-started.html)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the browser developer console for errors
3. Check the GitHub Actions logs for deployment issues
4. Open an issue in this repository with detailed error information

## 🔄 Updates

To update your deployment:

1. Make your changes locally
2. Test with `yarn start`
3. Commit and push to main branch
4. GitHub Actions will automatically rebuild and deploy

For manual updates:
```bash
yarn build
yarn deploy
```