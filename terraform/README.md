# Terraform Configuration for Datadog APM Vending Machine

This Terraform module manages the Azure AD application registration and related resources for the Datadog APM Vending Machine.

## Features

- 🔐 Azure AD Application Registration with proper API permissions
- 🔑 Service Principal creation and delegated permissions
- 🌐 GitHub integration for storing secrets
- ✅ Publisher domain verification support
- 🏷️ Consistent resource tagging

## Prerequisites

- Terraform >= 1.5.0
- Azure CLI or Service Principal credentials
- GitHub Personal Access Token (if using GitHub integration)
- Azure AD permissions to create applications

## Quick Start

1. Copy the example variables file:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your values

3. Initialize Terraform:
   ```bash
   terraform init
   ```

4. Review the plan:
   ```bash
   terraform plan
   ```

5. Apply the configuration:
   ```bash
   terraform apply
   ```

## Publisher Domain Verification

This module supports automatic publisher domain verification to remove "unverified" warnings from Azure AD consent screens.

### Option A: Root GitHub Pages Domain (Recommended)
```hcl
publisher_domain_repo = "yourusername.github.io"
publisher_domain      = "yourusername.github.io"
```

### Option B: Project-Specific Domain
```hcl
publisher_domain_repo = ""  # Leave empty
publisher_domain      = "yourusername.github.io/project-name"
```

<!-- BEGIN_TF_DOCS -->
<!-- This section will be automatically populated by terraform-docs -->

<!-- END_TF_DOCS -->

## CI/CD Integration

This module includes GitHub Actions workflows for:

- **Validation**: Format checking, validation, and security scanning
- **Planning**: Automatic plan generation on pull requests
- **Drift Detection**: Daily checks for configuration drift

### Required GitHub Secrets

For CI/CD pipelines, configure these secrets:

- `ARM_TENANT_ID`: Azure AD Tenant ID
- `ARM_CLIENT_ID`: Service Principal Client ID
- `ARM_CLIENT_SECRET`: Service Principal Client Secret
- `ARM_SUBSCRIPTION_ID`: Azure Subscription ID

### Optional GitHub Variables

- `SLACK_WEBHOOK_URL`: For drift detection notifications

## Security Considerations

- All sensitive values use Terraform variables
- Service Principal credentials should use least-privilege access
- Enable state file encryption if using remote backend
- Regular drift detection helps identify unauthorized changes

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure your Azure AD account has Application Developer role
2. **GitHub Token Invalid**: Regenerate token with `repo` scope
3. **Terraform State Lock**: Use `terraform force-unlock` if needed

### Debug Mode

Enable detailed logging:
```bash
export TF_LOG=DEBUG
terraform apply
```

## Contributing

1. Run format check: `terraform fmt -recursive`
2. Run validation: `terraform validate`
3. Update documentation: `terraform-docs markdown . --output-file README.md`

## License

See the main project LICENSE file.