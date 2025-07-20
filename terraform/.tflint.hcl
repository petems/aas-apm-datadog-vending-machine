# TFLint configuration for Azure Terraform modules

plugin "azurerm" {
  enabled = true
  version = "0.26.0"
  source  = "github.com/terraform-linters/tflint-ruleset-azurerm"
}

# Enable all rules by default
config {
  # Disable rules that might not apply to our use case
  disabled_by_default = false
}

# Azure-specific rules
rule "azurerm_resource_missing_tags" {
  enabled = true
  tags = ["Project", "ManagedBy", "Environment"]
}

# Terraform best practices
rule "terraform_deprecated_interpolation" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = true
}

rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_module_pinned_source" {
  enabled = true
}

rule "terraform_naming_convention" {
  enabled = true
}

rule "terraform_required_version" {
  enabled = true
}

rule "terraform_required_providers" {
  enabled = true
}

rule "terraform_unused_declarations" {
  enabled = true
}

rule "terraform_workspace_remote" {
  enabled = true
}

# Ensure consistent formatting
rule "terraform_comment_syntax" {
  enabled = true
}

rule "terraform_empty_list_equality" {
  enabled = true
}