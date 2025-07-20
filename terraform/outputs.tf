output "application_client_id" {
  description = "The Application (client) ID of the Azure AD app registration"
  value       = azuread_application.datadog_vending_machine.application_id
  sensitive   = false
}

output "application_object_id" {
  description = "The Object ID of the Azure AD application"
  value       = azuread_application.datadog_vending_machine.object_id
}

output "service_principal_object_id" {
  description = "The Object ID of the service principal"
  value       = azuread_service_principal.datadog_vending_machine.object_id
}

output "application_name" {
  description = "The display name of the Azure AD application"
  value       = azuread_application.datadog_vending_machine.display_name
}

output "redirect_uris" {
  description = "Configured redirect URIs"
  value       = local.all_redirect_uris
}

output "environment" {
  description = "Current environment"
  value       = var.environment
}

output "terraform_workspace" {
  description = "Current Terraform workspace"
  value       = terraform.workspace
}

output "azure_portal_url" {
  description = "Direct link to the app registration in Azure Portal"
  value       = "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/${azuread_application.datadog_vending_machine.application_id}"
}

output "github_secret_created" {
  description = "Whether GitHub repository secret was created"
  value       = var.create_github_secret && var.github_owner != "" && var.github_repository != "" ? "✅ GitHub secret REACT_APP_CLIENT_ID created successfully" : "❌ GitHub secret not created (requires github_owner and github_repository variables)"
}

output "github_repository_url" {
  description = "GitHub repository URL"
  value       = var.github_owner != "" && var.github_repository != "" ? "https://github.com/${var.github_owner}/${var.github_repository}" : "Not configured"
}

# Instructions for next steps
output "next_steps" {
  description = "Next steps after creating the app registration"
  value = var.create_github_secret && var.github_owner != "" && var.github_repository != "" ? join("\n", [
    "",
    "✅ Azure AD App Registration created successfully!",
    "✅ GitHub repository secret configured automatically!",
    "",
    "📋 Next Steps:",
    "1. Your Client ID (${azuread_application.datadog_vending_machine.application_id}) has been automatically added to GitHub secrets",
    "2. The .env.example file has been updated in your repository",
    "3. Deploy your React app - GitHub Actions will use the secret automatically",
    "4. Grant admin consent in Azure Portal: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/${azuread_application.datadog_vending_machine.application_id}",
    "",
    "🔗 View in Azure Portal: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/${azuread_application.datadog_vending_machine.application_id}",
    "🔗 View GitHub Repository: https://github.com/${var.github_owner}/${var.github_repository}",
    ""
  ]) : join("\n", [
    "",
    "✅ Azure AD App Registration created successfully!",
    "",
    "📋 Next Steps:",
    "1. Copy the Client ID: ${azuread_application.datadog_vending_machine.application_id}",
    "2. Add it to your environment variables:",
    "   - For local development: Add REACT_APP_CLIENT_ID to your .env file",
    "   - For GitHub Pages: Add REACT_APP_CLIENT_ID to GitHub repository secrets",
    "3. Update your redirect URIs by running:",
    "   terraform apply -var='redirect_uris=[\"https://yourusername.github.io/your-repo-name/\"]'",
    "4. Grant admin consent in Azure Portal: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/${azuread_application.datadog_vending_machine.application_id}",
    "",
    "🔗 View in Azure Portal: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/${azuread_application.datadog_vending_machine.application_id}",
    "",
    "💡 Tip: Enable GitHub integration by setting github_owner and github_repository variables!",
    ""
  ])
} 