terraform {
  required_version = ">= 1.0"
  required_providers {
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

# Configure the Azure Active Directory Provider
provider "azuread" {
  # Uses Azure CLI authentication by default
}

# Configure the Azure Provider
provider "azurerm" {
  features {}
}

# Configure the GitHub Provider
provider "github" {
  # Uses GITHUB_TOKEN environment variable by default
}

# Get current Azure client configuration
data "azuread_client_config" "current" {}

# Local values for resource naming and tagging
locals {
  # Naming convention: project-environment-purpose
  app_name_formatted = "${var.app_name}${var.environment != "prod" ? " (${title(var.environment)})" : ""}"

  # Consistent tagging strategy
  common_tags = merge(var.tags, {
    Environment = var.environment
    CreatedBy   = data.azuread_client_config.current.object_id
    CreatedDate = timestamp()
    Workspace   = terraform.workspace
  })

  # Determine redirect URIs based on environment
  default_redirect_uris = var.environment == "dev" ? [
    "http://localhost:3000",
    "http://localhost:3001"
  ] : []

  # Combine provided URIs with defaults
  all_redirect_uris = distinct(concat(var.redirect_uris, local.default_redirect_uris))
}
