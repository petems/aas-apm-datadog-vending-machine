# Terraform Infrastructure for Datadog APM Vending Machine

This directory contains Terraform configuration to automatically provision the Azure AD App Registration required for the Datadog APM Vending Machine application.

## 🏗️ What This Creates

The Terraform configuration provisions:

- **Azure AD Application Registration** - Multitenant app with proper permissions
- **Service Principal** - For the application to authenticate
- **API Permissions** - Azure Service Management API with user_impersonation scope
- **Admin Consent** - Automatic consent for the required permissions (if you have admin rights)
- **SPA Configuration** - Single Page Application settings with redirect URIs
- **GitHub Repository Secret** - Automatically adds `REACT_APP_CLIENT_ID` to your GitHub repository (optional)
- **Environment File** - Updates `.env.example` with the client ID (optional)
- **Publisher Domain Verification** - Optional verification file for root GitHub Pages domain

## 🚀 CI/CD Workflows

The project includes a GitHub Actions workflow for Terraform validation:

### 🔍 Validation Workflow (`terraform-validate.yml`)
- **Trigger**: On push/PR to terraform files
- **Features**:
  - Format checking with `terraform fmt`
  - Configuration validation
  - Security scanning with Trivy, Checkov, and tfsec
  - TFLint analysis for best practices
  - Auto-comments on PRs with issues

## 📋 Prerequisites

1. **Azure CLI** installed and authenticated:
   ```bash
   az login
   ```

2. **Terraform** installed (>= 1.0):
   ```bash
   # macOS
   brew install terraform
   
   # Or download from https://terraform.io/downloads
   ```

3. **Azure Permissions**:
   - Application Administrator (to create app registrations)
   - Or Global Administrator (for admin consent)

4. **GitHub CLI and Token** (optional, for GitHub integration):
   ```bash
   # Install GitHub CLI (if not already installed)
   # macOS: brew install gh
   # Or download from https://cli.github.com/
   
   # Authenticate with GitHub (interactive)
   gh auth login --scopes repo
   
   # Export token for Terraform
   export GITHUB_TOKEN=$(gh auth token)
   ```

## 🚀 Quick Start

### Option 1: Deploy with Azure Cloud Shell (Easiest)

Click the button below to get started immediately:

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://shell.azure.com/bash?resource=https://github.com/peter-souter/aas-apm-datadog-vending-machine)

💡 **Azure Cloud Shell has Terraform and GitHub CLI pre-installed** - no setup required!

After clicking, run these commands in Azure Cloud Shell:
```bash
cd aas-apm-datadog-vending-machine/terraform
terraform init
cp terraform.tfvars.example terraform.tfvars

# Edit with your configuration
code terraform.tfvars

# Set GitHub token for full automation (optional)
gh auth login --scopes repo  # if not already authenticated
export GITHUB_TOKEN=$(gh auth token)

# Deploy everything
terraform plan
terraform apply
```

**Example terraform.tfvars for full automation:**
```hcl
redirect_uris = ["https://yourusername.github.io/your-repo-name/"]
create_github_secret = true
github_owner = "yourusername"
github_repository = "your-repo-name"
```

### Option 2: Local Development

1. **Navigate to terraform directory**:
   ```bash
   cd terraform
   ```

2. **Initialize Terraform**:
   ```bash
   terraform init
   ```

3. **Create variables file**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

4. **Edit terraform.tfvars** with your settings:
   ```hcl
   app_name = "Datadog APM Vending Machine"
   
   redirect_uris = [
     "https://yourusername.github.io/your-repo-name/",
     "http://localhost:3000"
   ]
   
   environment = "prod"
   
   # Enable GitHub integration (optional)
   create_github_secret = true
   github_owner         = "yourusername"
   github_repository    = "your-repo-name"
   ```

5. **Set GitHub token** (if using GitHub integration):
   ```bash
   gh auth login --scopes repo  # if not already authenticated
   export GITHUB_TOKEN=$(gh auth token)
   ```

6. **Plan the deployment**:
   ```bash
   terraform plan
   ```

7. **Apply the configuration**:
   ```bash
   terraform apply
   ```

8. **Done!** With GitHub integration enabled, everything is configured automatically.

## 📁 File Structure

```
terraform/
├── main.tf                    # Provider configuration
├── azuread.tf                 # Azure AD App Registration
├── github.tf                  # GitHub repository integration
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── terraform.tfvars.example   # Example variables
├── terraform.tfvars          # Your variables (create this)
└── .gitignore                # Terraform-specific gitignore
```

## 🔧 Configuration Variables

| Variable | Description | Type | Default | Required |
|----------|-------------|------|---------|----------|
| `app_name` | Name of the Azure AD application | string | "Datadog APM Vending Machine" | No |
| `redirect_uris` | List of redirect URIs (GitHub Pages, localhost) | list(string) | [] | Yes |
| `environment` | Environment name (dev, staging, prod) | string | "dev" | No |
| `tags` | Tags to apply to resources | map(string) | See variables.tf | No |
| `create_github_secret` | Create GitHub repository secret | bool | false | No |
| `github_owner` | GitHub repository owner/organization | string | "" | No |
| `github_repository` | GitHub repository name | string | "" | No |
| `github_token` | GitHub PAT (or use GITHUB_TOKEN env var) | string | "" | No |

## 📤 Outputs

After successful deployment, Terraform provides:

- **`application_client_id`** - The Client ID for your React app
- **`azure_portal_url`** - Direct link to the app registration
- **`github_secret_created`** - Status of GitHub secret creation
- **`github_repository_url`** - Link to your GitHub repository
- **`next_steps`** - Detailed instructions for next steps

## 🔄 Updating Redirect URIs

To update redirect URIs after initial deployment:

```bash
terraform apply -var='redirect_uris=["https://yournewurl.github.io/repo/", "http://localhost:3000"]'
```

## 🧪 Different Environments

### Development Environment
```bash
terraform apply -var='environment=dev' -var='app_name=Datadog Vending Machine (Dev)'
```

### Production Environment
```bash
terraform apply -var='environment=prod' -var='redirect_uris=["https://yourprod.github.io/repo/"]'
```

## 🔐 Security Considerations

1. **Terraform State**: Contains sensitive information. Consider using:
   - [Terraform Cloud](https://app.terraform.io/) (recommended)
   - [Azure Storage backend](https://www.terraform.io/docs/language/settings/backends/azurerm.html)

2. **Admin Consent**: The configuration attempts to grant admin consent automatically. If this fails:
   - Go to Azure Portal → App Registrations → Your App → API Permissions
   - Click "Grant admin consent"

3. **Least Privilege**: The app only requests minimal required permissions (Azure Service Management - user_impersonation)

## 🛠️ Troubleshooting

### Common Issues

**`Error: insufficient privileges to complete the operation`**
- You need Application Administrator or Global Administrator role
- Or ask an admin to run the Terraform configuration

**`Error: admin consent could not be granted`**
- The automated admin consent failed
- Manually grant consent in Azure Portal
- Or comment out the `azuread_service_principal_delegated_permission_grant` resource

**`Error: redirect URI already exists`**
- Another app registration uses the same redirect URI
- Use a different URL or remove the conflicting registration

### Manual Admin Consent

If automatic admin consent fails:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to Azure Active Directory → App Registrations
3. Find your app registration
4. Go to API Permissions
5. Click "Grant admin consent for [Your Organization]"

## 🧹 Cleanup

To remove all created resources:

```bash
terraform destroy
```

## 🐙 GitHub Integration

### Automatic GitHub Configuration

Enable complete automation by configuring GitHub integration:

```hcl
# In terraform.tfvars
create_github_secret = true
github_owner         = "yourusername"
github_repository    = "your-repo-name"
```

This will:
- ✅ Create `REACT_APP_CLIENT_ID` secret in your GitHub repository
- ✅ Update `.env.example` with the client ID
- ✅ Enable automatic deployment via GitHub Actions

### GitHub Token Setup

Use the GitHub CLI to authenticate and get a token:

```bash
# Install GitHub CLI (if not already installed)
# macOS
brew install gh

# Windows
winget install --id GitHub.cli

# Linux (Ubuntu/Debian)
sudo apt update && sudo apt install gh

# Authenticate with GitHub and request repo scope
gh auth login --scopes repo

# Export the token for Terraform use
export GITHUB_TOKEN=$(gh auth token)

# Verify authentication
gh auth status
```

**Alternative: Manual Token Creation**

If you prefer manual token creation:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (Full control of private repositories)
4. Set token as environment variable:
   ```bash
   export GITHUB_TOKEN="github_pat_your_token_here"
   ```

### Manual GitHub Configuration

If you prefer manual setup, skip the GitHub variables and add the secret manually:

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `REACT_APP_CLIENT_ID`
4. Value: Copy from Terraform output

### GitHub CLI Troubleshooting

**Authentication Issues:**
```bash
# Check current auth status
gh auth status

# Re-authenticate if needed
gh auth logout
gh auth login --scopes repo

# Verify token works
gh api user
```

**Token Scope Issues:**
```bash
# If you get permission errors, ensure repo scope is included
gh auth refresh --scopes repo

# Check your current scopes
gh auth token | gh api user --input-file=-
```

**Azure Cloud Shell:**
```bash
# GitHub CLI is pre-installed in Azure Cloud Shell
# Just authenticate and you're ready
gh auth login --scopes repo
export GITHUB_TOKEN=$(gh auth token)
```

## 📚 Advanced Configuration

### Backend Configuration

For production, configure remote state:

```hcl
# In main.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "terraformstatestg"
    container_name       = "tfstate"
    key                  = "datadog-vending-machine.terraform.tfstate"
  }
}
```

### Multiple Environments

Use Terraform workspaces:

```bash
# Create development workspace
terraform workspace new development
terraform apply -var-file="dev.tfvars"

# Switch to production
terraform workspace new production
terraform apply -var-file="prod.tfvars"
```

## 🤝 Integration with CI/CD

### GitHub Actions

```yaml
name: Terraform
on:
  push:
    paths: ['terraform/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: hashicorp/setup-terraform@v2
      
      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
          
      - name: Terraform Init
        run: terraform init
        working-directory: terraform
        
      - name: Terraform Plan
        run: terraform plan
        working-directory: terraform
        
      - name: Terraform Apply
        if: github.ref == 'refs/heads/master'
        run: terraform apply -auto-approve
        working-directory: terraform
```

## 📖 Next Steps

After running Terraform:

1. **Copy the Client ID** from the output
2. **Update your React app configuration**:
   - Add to `.env` file: `REACT_APP_CLIENT_ID=<client-id>`
   - Add to GitHub repository secrets: `REACT_APP_CLIENT_ID`
3. **Test the authentication flow** in your application
4. **Deploy your React app** to the configured redirect URI

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Terraform logs with `TF_LOG=DEBUG terraform apply`
3. Verify Azure CLI authentication with `az account show`
4. Open an issue with the error details
