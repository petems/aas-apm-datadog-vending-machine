# Azure AD Application Registration
resource "azuread_application" "datadog_vending_machine" {
  display_name     = local.app_name_formatted
  description      = "Azure vending machine for enabling Datadog APM on App Services (${var.environment})"
  sign_in_audience = "AzureADMultipleOrgs"
  owners           = [data.azuread_client_config.current.object_id]

  # API permissions
  required_resource_access {
    resource_app_id = "797f4846-ba00-4fd7-ba43-dac1f8f63013" # Azure Service Management API

    resource_access {
      id   = "41094075-9dad-400e-a0bd-54e686782033" # user_impersonation
      type = "Scope"
    }
  }

  # Enable implicit grant flow for SPA
  implicit_grant {
    access_token_issuance_enabled = true
    id_token_issuance_enabled     = true
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

  # Optional API configuration for future extensibility
  api {
    mapped_claims_enabled          = false
    requested_access_token_version = 2
  }

  tags = [
    "terraform", 
    "datadog", 
    "apm", 
    "vending-machine",
    var.environment
  ]
}

# Service Principal for the application
resource "azuread_service_principal" "datadog_vending_machine" {
  application_id                = azuread_application.datadog_vending_machine.application_id
  app_role_assignment_required  = false
  owners                        = [data.azuread_client_config.current.object_id]

  tags = [
    "terraform", 
    "datadog", 
    "apm",
    var.environment
  ]
}

# Get the Azure Service Management API service principal
data "azuread_service_principal" "azure_service_management" {
  application_id = "797f4846-ba00-4fd7-ba43-dac1f8f63013"
}

# Admin consent for the API permissions (requires admin privileges)
resource "azuread_service_principal_delegated_permission_grant" "datadog_vending_machine" {
  service_principal_object_id          = azuread_service_principal.datadog_vending_machine.object_id
  resource_service_principal_object_id = data.azuread_service_principal.azure_service_management.object_id
  claim_values                         = ["user_impersonation"]
} 