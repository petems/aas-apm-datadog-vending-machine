# Azure AD Application Registration
resource "azuread_application" "datadog_vending_machine" {
  display_name     = local.app_name_formatted
  description      = "Self-service Azure vending machine for enabling Datadog APM monitoring on Azure App Services. Allows users to automatically deploy Datadog monitoring to their existing applications with ARM templates."
  sign_in_audience = "AzureADMultipleOrgs"
  owners           = [data.azuread_client_config.current.object_id]

  # Enhanced branding for better consent experience
  marketing_url         = length(local.all_redirect_uris) > 0 ? local.all_redirect_uris[0] : null
  support_url           = var.github_owner != "" && var.github_repository != "" ? "https://github.com/${var.github_owner}/${var.github_repository}/issues" : null
  privacy_statement_url = var.github_owner != "" && var.github_repository != "" ? "https://github.com/${var.github_owner}/${var.github_repository}#security-considerations" : null
  terms_of_service_url  = length(local.all_redirect_uris) > 0 ? "${local.all_redirect_uris[0]}terms-of-service.html" : null

  # API permissions
  required_resource_access {
    resource_app_id = "797f4846-ba00-4fd7-ba43-dac1f8f63013" # Azure Service Management API

    resource_access {
      id   = "41094075-9dad-400e-a0bd-54e686782033" # user_impersonation
      type = "Scope"
    }
  }

  # Single Page Application configuration
  single_page_application {
    redirect_uris = local.all_redirect_uris
  }

  # Web application configuration (if needed for hybrid scenarios)
  web {
    homepage_url = length(local.all_redirect_uris) > 0 ? local.all_redirect_uris[0] : null

    implicit_grant {
      access_token_issuance_enabled = true
      id_token_issuance_enabled     = true
    }
  }

  # Application metadata for better consent experience
  notes = "This application enables users to deploy Datadog APM monitoring to their Azure App Services through a self-service web interface. It uses Azure Resource Manager templates to configure Datadog monitoring without requiring manual setup."

  # Optional API configuration for future extensibility
  api {
    mapped_claims_enabled          = false
    requested_access_token_version = 2
  }

  tags = [
    "terraform",
    "datadog",
    "apm",
    var.environment
  ]
}

# Service Principal for the application
resource "azuread_service_principal" "datadog_vending_machine" {
  client_id                    = azuread_application.datadog_vending_machine.client_id
  app_role_assignment_required = false
  owners                       = [data.azuread_client_config.current.object_id]

  tags = [
    "terraform",
    "datadog",
    "apm",
    var.environment
  ]
}

# Get the Azure Service Management API service principal
data "azuread_service_principal" "azure_service_management" {
  client_id = "797f4846-ba00-4fd7-ba43-dac1f8f63013"
}

# Admin consent for the API permissions (requires admin privileges)
resource "azuread_service_principal_delegated_permission_grant" "datadog_vending_machine" {
  service_principal_object_id          = azuread_service_principal.datadog_vending_machine.object_id
  resource_service_principal_object_id = data.azuread_service_principal.azure_service_management.object_id
  claim_values                         = ["user_impersonation"]
} 