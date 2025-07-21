variable "app_name" {
  description = "Name of the Azure AD application"
  type        = string
  default     = "Datadog APM Vending Machine"

  validation {
    condition     = length(var.app_name) > 0 && length(var.app_name) <= 120
    error_message = "App name must be between 1 and 120 characters."
  }
}

variable "redirect_uris" {
  description = "List of redirect URIs for the application (e.g., GitHub Pages URLs)"
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for uri in var.redirect_uris : can(regex("^https://", uri)) || can(regex("^http://localhost", uri))
    ])
    error_message = "All redirect URIs must use HTTPS (except localhost for development)."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    Project   = "Datadog APM Vending Machine"
    ManagedBy = "Terraform"
  }
}

variable "github_owner" {
  description = "GitHub repository owner (username or organization)"
  type        = string
  default     = ""
}

variable "github_repository" {
  description = "GitHub repository name"
  type        = string
  default     = ""
}

variable "support_email" {
  description = "Support email address for the application"
  type        = string
  default     = ""

  validation {
    condition     = var.support_email == "" || can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.support_email))
    error_message = "Support email must be a valid email address or empty string."
  }
}

variable "create_github_secret" {
  description = "Whether to create GitHub repository secret for REACT_APP_CLIENT_ID"
  type        = bool
  default     = false
}

variable "terms_of_service_url" {
  description = "Custom Terms of Service URL for the Azure AD application. If not specified, defaults to GitHub Pages terms-of-service.html"
  type        = string
  default     = ""

  validation {
    condition     = var.terms_of_service_url == "" || can(regex("^https://", var.terms_of_service_url))
    error_message = "Terms of service URL must be a valid HTTPS URL or empty string."
  }
} 