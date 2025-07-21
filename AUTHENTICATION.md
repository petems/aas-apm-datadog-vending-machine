# Authentication and User Access

## Overview

The Datadog APM Azure Vending Machine uses Azure Active Directory (Azure AD) for authentication and is configured to support **organizational accounts only** (`AzureADMultipleOrgs`).

## Supported Account Types

### ✅ **Organizational Accounts (Work/School)**
- **Microsoft 365 Business accounts** (user@company.onmicrosoft.com)
- **Azure AD accounts from any organization**
- **Guest users** in Azure AD tenants
- **Hybrid identity accounts** (on-premises AD synced to Azure AD)

### ❌ **Personal Microsoft Accounts**
- **Outlook.com, Hotmail.com, Live.com accounts** are **NOT supported**
- This is intentional - see [Why Organizational Only?](#why-organizational-only) below

## User Experience

### For Users in External Organizations

1. **Click "Sign in with Azure"**
2. **Enter your work/school email** (e.g., user@yourcompany.com)
3. **Grant consent** when prompted:
   ```
   Datadog APM Vending Machine wants to:
   - Sign you in and read your profile
   - Access Azure Service Management as you
   ```
4. **Click "Accept"** to proceed

### Required Permissions

Users need **Azure subscription access** with permissions to:
- **Read subscriptions** (`Microsoft.Resources/subscriptions/read`)
- **Read resource groups** (`Microsoft.Resources/subscriptions/resourceGroups/read`)
- **Read App Services** (`Microsoft.Web/sites/read`)
- **Deploy ARM templates** (`Microsoft.Resources/deployments/write`)

## Why Organizational Only?

### 1. **Platform Limitations**
- **Personal Microsoft accounts have limited Azure Resource Manager API access**
- Many Azure management operations are restricted to organizational accounts
- ARM template deployments typically require organizational context

### 2. **Security Best Practices**
- **Azure subscriptions are typically organizational resources**
- Organizations prefer restricting external app access to work accounts
- Easier compliance with corporate security policies

### 3. **User Experience**
- **Avoids confusing error messages** for personal account users
- **Clear expectations** about who can use the tool
- **Better error handling** for unsupported account types

## Multi-Tenant Access

### For External Organizations

**✅ Users from other organizations CAN use this app:**

1. **No publisher verification required** (for organizational accounts)
2. **Standard Azure AD consent flow** applies
3. **Tenant admins can pre-approve** the application if desired
4. **Works across different Azure regions and environments**

### Admin Considerations

**Tenant administrators can:**
- **Pre-approve the application** for all users in their tenant
- **Block external applications** through conditional access policies
- **Review permissions** before allowing user consent
- **Monitor usage** through Azure AD sign-in logs

## Technical Configuration

### Azure AD App Registration
```hcl
# terraform/azuread.tf
sign_in_audience = "AzureADMultipleOrgs"
```

### React App Authority
```typescript
// src/authConfig.ts
authority: 'https://login.microsoftonline.com/common'
```

### Required API Permissions
- **Azure Service Management** (`https://management.azure.com/`)
  - **user_impersonation** scope
  - **Admin consent recommended** (but not required)

## Troubleshooting

### Common Issues

**"You need administrator approval"**
- **Solution**: Contact your IT administrator to grant consent
- **Alternative**: Admin can pre-approve the application

**"Access denied"** 
- **Check**: You have appropriate Azure subscription permissions
- **Verify**: Your account has access to the target subscription/resource group

**"Unauthorized"**
- **Ensure**: You're using a work/school account, not personal
- **Verify**: Your organization allows external application access

### For Administrators

**To pre-approve for your organization:**
1. Visit: [Azure Portal App Registrations](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps)
2. Search for: "Datadog APM Vending Machine"
3. Go to: **API permissions** → **Grant admin consent**

## Frequently Asked Questions

### Q: Can personal Microsoft accounts use this tool?
**A:** No, personal accounts (Outlook.com, Hotmail.com, etc.) cannot use this tool. You need a work or school account with Azure subscription access.

### Q: Can users from other companies/organizations use this?
**A:** Yes! Users from any organization with Azure AD can use this tool, subject to their organization's policies.

### Q: Do I need to be in a specific Azure tenant?
**A:** No, this app supports users from any Azure AD tenant ("multi-tenant"). You just need a work/school account with appropriate Azure permissions.

### Q: Why can't I sign in with my personal Microsoft account?
**A:** Personal accounts have limited access to Azure Resource Manager APIs. Since this tool deploys Azure resources, organizational accounts are required.

### Q: Can my organization block this app?
**A:** Yes, tenant administrators can block external applications through conditional access policies or by requiring admin pre-approval.

## Support

For authentication issues:
- **Check this documentation first**
- **Verify your account type** (work/school vs. personal)
- **Contact your IT administrator** if you need organizational approval
- **Create a GitHub issue** for technical problems: [Issues](https://github.com/petems/aas-apm-datadog-vending-machine/issues)

---

*Last updated: January 21, 2025* 