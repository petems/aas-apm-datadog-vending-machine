# GitHub repository secret for REACT_APP_CLIENT_ID
resource "github_actions_secret" "react_app_client_id" {
  count           = var.create_github_secret && var.github_owner != "" && var.github_repository != "" ? 1 : 0
  repository      = var.github_repository
  secret_name     = "REACT_APP_CLIENT_ID"
  plaintext_value = azuread_application.datadog_vending_machine.client_id
}

# Optional: Create .env.example file in the repository
resource "github_repository_file" "env_example" {
  count          = var.create_github_secret && var.github_owner != "" && var.github_repository != "" ? 1 : 0
  repository     = var.github_repository
  branch         = "master" # Adjust if your default branch is different
  file           = ".env.example"
  content        = <<-EOT
# Environment variables for local development
# Copy this file to .env and update with your values

# Azure AD Application Client ID
REACT_APP_CLIENT_ID=${azuread_application.datadog_vending_machine.client_id}

# Optional: Enable debug logging
# REACT_APP_DEBUG=true
EOT
  commit_message = "chore: update .env.example with Azure AD client ID"
  commit_author  = "Terraform"
  commit_email   = "terraform@example.com"

  # Only update if the file doesn't exist or content has changed
  overwrite_on_create = true
} 