#!/bin/bash

# Publisher Domain Setup Helper for Azure AD Application
# IMPORTANT: Due to Azure API limitations, publisher domain MUST be set manually in Azure Portal
# This script validates prerequisites and provides guidance for manual setup
# Usage: ./update-publisher-domain.sh [APPLICATION_ID] [DOMAIN]

set -e

# Parse arguments
APPLICATION_ID="${1:-}"
PUBLISHER_DOMAIN="${2:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔗 Azure AD Publisher Domain Setup Helper${NC}"
echo "=========================================="
echo -e "${YELLOW}⚠️  IMPORTANT: Publisher domain must be set manually in Azure Portal${NC}"
echo -e "${YELLOW}    This script validates prerequisites and provides setup guidance${NC}"
echo "=============================================="

# Function to show usage
show_usage() {
    echo -e "\n${YELLOW}Usage:${NC}"
    echo "  $0 [APPLICATION_ID] [DOMAIN]"
    echo ""
    echo -e "${YELLOW}Purpose:${NC}"
    echo "  Validates prerequisites and provides setup guidance for Azure AD publisher domain"
    echo "  NOTE: Due to Azure API limitations, manual Azure Portal setup is required"
    echo ""
    echo -e "${YELLOW}Arguments:${NC}"
    echo "  APPLICATION_ID    Azure AD Application (Client) ID"
    echo "  DOMAIN           Publisher domain to validate (e.g., example.com)"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 12345678-1234-1234-1234-123456789012 example.com"
    echo "  $0 auto petems.github.io                    # Root GitHub Pages domain (recommended)"
    echo "  $0 auto petems.github.io/project-name       # Project-specific domain"
    echo ""
    echo -e "${YELLOW}Special values:${NC}"
    echo "  'auto' for APPLICATION_ID - Auto-detect from Terraform state"
    echo ""
}

# Get application ID from Terraform if not provided or if 'auto'
if [ -z "$APPLICATION_ID" ] || [ "$APPLICATION_ID" = "auto" ]; then
    echo -e "${CYAN}🔍 Auto-detecting Application ID from Terraform...${NC}"
    
    # Try multiple locations for terraform state
    TERRAFORM_DIRS=("terraform" "." "../terraform")
    APPLICATION_ID=""
    
    for dir in "${TERRAFORM_DIRS[@]}"; do
        if [ -f "$dir/terraform.tfstate" ] && command -v terraform >/dev/null 2>&1; then
            cd "$dir" 2>/dev/null || continue
            APPLICATION_ID=$(terraform output -raw application_client_id 2>/dev/null || echo "")
            if [ -n "$APPLICATION_ID" ] && [ "$APPLICATION_ID" != "null" ]; then
                echo -e "${GREEN}✅ Found Application ID: $APPLICATION_ID${NC}"
                cd - >/dev/null
                break
            fi
            cd - >/dev/null
        fi
    done
    
    if [ -z "$APPLICATION_ID" ] || [ "$APPLICATION_ID" = "null" ]; then
        echo -e "${RED}❌ Could not auto-detect Application ID from Terraform state${NC}"
        echo -e "${YELLOW}💡 Please provide the Application ID manually${NC}"
        show_usage
        exit 1
    fi
fi

# Validate Application ID format (UUID)
if ! echo "$APPLICATION_ID" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; then
    echo -e "${RED}❌ Invalid Application ID format. Must be a valid UUID.${NC}"
    echo -e "${YELLOW}💡 Example: 12345678-1234-1234-1234-123456789012${NC}"
    exit 1
fi

# Get publisher domain if not provided
if [ -z "$PUBLISHER_DOMAIN" ]; then
    echo -e "\n${YELLOW}🌐 Publisher Domain Required${NC}"
    echo "Enter the domain you want to set as publisher domain:"
    echo "Examples: example.com, subdomain.example.com, yourname.github.io"
    read -p "Domain: " PUBLISHER_DOMAIN
    
    if [ -z "$PUBLISHER_DOMAIN" ]; then
        echo -e "${RED}❌ Publisher domain is required${NC}"
        exit 1
    fi
fi

# Validate domain format (allow both domain.com and domain.com/path for GitHub Pages)
if ! echo "$PUBLISHER_DOMAIN" | grep -qE '^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$' && ! echo "$PUBLISHER_DOMAIN" | grep -qE '^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]/[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$'; then
    echo -e "${RED}❌ Invalid domain format: $PUBLISHER_DOMAIN${NC}"
    echo -e "${YELLOW}💡 Domain should be like: example.com, subdomain.example.com, or username.github.io/project${NC}"
    exit 1
fi

# Extract base domain for GitHub Pages detection
BASE_DOMAIN=$(echo "$PUBLISHER_DOMAIN" | cut -d'/' -f1)

echo -e "\n${CYAN}📋 Configuration:${NC}"
echo "  Application ID: $APPLICATION_ID"
echo "  Publisher Domain: $PUBLISHER_DOMAIN"

# Check if Azure CLI is installed and authenticated
if ! command -v az >/dev/null 2>&1; then
    echo -e "\n${RED}❌ Azure CLI is not installed${NC}"
    echo -e "${YELLOW}💡 Install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli${NC}"
    exit 1
fi

# Check Azure CLI authentication
echo -e "\n${CYAN}🔐 Checking Azure CLI authentication...${NC}"
if ! az account show >/dev/null 2>&1; then
    echo -e "${RED}❌ Not authenticated with Azure CLI${NC}"
    echo -e "${YELLOW}💡 Please run: az login${NC}"
    exit 1
fi

CURRENT_USER=$(az account show --query user.name -o tsv 2>/dev/null || echo "Unknown")
echo -e "${GREEN}✅ Authenticated as: $CURRENT_USER${NC}"

# Check domain verification (look for verification file)
echo -e "\n${CYAN}🔍 Checking domain verification...${NC}"

# For GitHub Pages, check if we need to include repository path
VERIFICATION_URL="https://${PUBLISHER_DOMAIN}/.well-known/microsoft-identity-association.json"

# If this is a GitHub Pages domain, also try with common repository path patterns
if echo "$BASE_DOMAIN" | grep -q "\.github\.io$"; then
    echo "Detected GitHub Pages domain, checking multiple locations..."
    
    # Check if PUBLISHER_DOMAIN already includes a path
    if echo "$PUBLISHER_DOMAIN" | grep -q "/"; then
        # Domain already includes project path, use as-is
        VERIFICATION_URL="https://${PUBLISHER_DOMAIN}/.well-known/microsoft-identity-association.json"
        echo "Checking project domain: $VERIFICATION_URL"
    else
        # Root domain - try both root and with repository name
        echo "Checking root: $VERIFICATION_URL"
        if command -v curl >/dev/null 2>&1; then
            VERIFICATION_RESPONSE=$(curl -s -f "$VERIFICATION_URL" 2>/dev/null || echo "")
            if [ -z "$VERIFICATION_RESPONSE" ]; then
                # Try with repository name from terraform state
                if [ -f "terraform/terraform.tfvars" ]; then
                    REPO_NAME=$(grep -E "github_repository.*=" terraform/terraform.tfvars | cut -d'"' -f2 2>/dev/null || echo "")
                    if [ -n "$REPO_NAME" ]; then
                        VERIFICATION_URL="https://${PUBLISHER_DOMAIN}/${REPO_NAME}/.well-known/microsoft-identity-association.json"
                        echo "Trying with repository path: $VERIFICATION_URL"
                    fi
                fi
            fi
        fi
    fi
else
    echo "Checking: $VERIFICATION_URL"
fi

# Check if verification file exists and contains the application ID
if command -v curl >/dev/null 2>&1; then
    VERIFICATION_RESPONSE=$(curl -s -f "$VERIFICATION_URL" 2>/dev/null || echo "")
    if [ -n "$VERIFICATION_RESPONSE" ]; then
        if echo "$VERIFICATION_RESPONSE" | grep -q "$APPLICATION_ID"; then
            echo -e "${GREEN}✅ Domain verification file found and contains correct Application ID${NC}"
        else
            echo -e "${YELLOW}⚠️  Domain verification file found but may not contain correct Application ID${NC}"
            echo -e "${CYAN}📄 Current file content:${NC}"
            echo "$VERIFICATION_RESPONSE" | head -10
        fi
    else
        echo -e "${YELLOW}⚠️  Could not access domain verification file${NC}"
        echo -e "${YELLOW}📝 Make sure this file exists and is publicly accessible at:${NC}"
        echo "   $VERIFICATION_URL"
        if echo "$PUBLISHER_DOMAIN" | grep -q "\.github\.io$"; then
            echo -e "${YELLOW}💡 For GitHub Pages, ensure the file is deployed with your React app${NC}"
        fi
        echo ""
        echo -e "${YELLOW}📋 File should contain:${NC}"
        cat << EOF
{
  "associatedApplications": [
    {
      "applicationId": "$APPLICATION_ID"
    }
  ]
}
EOF
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}💡 Setup domain verification first, then run this script again${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  curl not available, skipping verification file check${NC}"
fi

# Validate current configuration and provide setup guidance
echo -e "\n${CYAN}🔍 Validating current configuration...${NC}"

# First, get current application details
echo "Getting current application configuration..."
CURRENT_APP=$(az rest --method GET \
    --url "https://graph.microsoft.com/v1.0/applications?$filter=appId eq '$APPLICATION_ID'" \
    --headers "Content-Type=application/json" 2>/dev/null || echo "")

if [ -z "$CURRENT_APP" ] || ! echo "$CURRENT_APP" | grep -q '"value"'; then
    echo -e "${RED}❌ Could not retrieve application details${NC}"
    echo -e "${YELLOW}💡 Make sure the Application ID is correct and you have proper permissions${NC}"
    exit 1
fi

# Extract the application object ID (different from client ID)
# More robust JSON parsing for the nested value array
if command -v jq >/dev/null 2>&1; then
    APPLICATION_OBJECT_ID=$(echo "$CURRENT_APP" | jq -r '.value[0].id // empty' 2>/dev/null)
    CURRENT_DOMAIN=$(echo "$CURRENT_APP" | jq -r '.value[0].publisherDomain // empty' 2>/dev/null)
else
    # Fallback to grep if jq is not available
    APPLICATION_OBJECT_ID=$(echo "$CURRENT_APP" | sed -n 's/.*"value":\[\{.*"id":"\([^"]*\)".*/\1/p' | head -1)
    CURRENT_DOMAIN=$(echo "$CURRENT_APP" | sed -n 's/.*"publisherDomain":"\([^"]*\)".*/\1/p' | head -1)
fi

# Ensure we have values or set defaults
[ -z "$CURRENT_DOMAIN" ] && CURRENT_DOMAIN="none"

echo "  Application Object ID: $APPLICATION_OBJECT_ID"
echo "  Current Publisher Domain: ${CURRENT_DOMAIN:-"(not set)"}"

if [ -z "$APPLICATION_OBJECT_ID" ]; then
    echo -e "${RED}❌ Could not extract application object ID${NC}"
    exit 1
fi

# Provide manual setup instructions
echo -e "\n${CYAN}📋 Publisher Domain Setup Instructions${NC}"
echo "=============================================="
echo -e "${YELLOW}⚠️  Azure API Limitation:${NC} Publisher domain is read-only via Microsoft Graph API"
echo -e "${YELLOW}✋ Manual Setup Required:${NC} You must set the publisher domain manually in Azure Portal"

echo -e "\n${CYAN}🛠️  Manual Setup Steps:${NC}"
echo "1. Open the Azure Portal branding page:"
PORTAL_URL="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Branding/appId/$APPLICATION_ID"
echo "   $PORTAL_URL"
echo ""
echo "2. In the 'Publisher domain' section:"
echo "   • Click 'Select a verified domain'"
echo "   • Choose: $PUBLISHER_DOMAIN"
echo "   • Click 'Verify and save domain'"
echo ""
echo "3. If domain verification is required:"
echo "   • Azure will guide you through the verification process"
echo "   • The verification file is already deployed and accessible"
echo ""
echo "4. After successful setup:"
echo "   • Run this script again to verify the configuration"
echo "   • Test the consent screen to see the verified publisher"

if [ "$CURRENT_DOMAIN" != "none" ] && [ "$CURRENT_DOMAIN" != "$PUBLISHER_DOMAIN" ]; then
    echo -e "\n${YELLOW}📝 Current Status:${NC}"
    echo "  Current Publisher Domain: $CURRENT_DOMAIN"
    echo "  Target Publisher Domain:  $PUBLISHER_DOMAIN"
    echo "  Action Required: Update in Azure Portal"
fi

echo -e "\n${CYAN}🔗 Additional Information:${NC}"
echo "• Domain verification file location:"
if echo "$PUBLISHER_DOMAIN" | grep -q "\.github\.io$" && [ -f "terraform/terraform.tfvars" ]; then
    REPO_NAME=$(grep -E "github_repository.*=" terraform/terraform.tfvars | cut -d'"' -f2 2>/dev/null || echo "")
    if [ -n "$REPO_NAME" ]; then
        echo "  https://$PUBLISHER_DOMAIN/$REPO_NAME/.well-known/microsoft-identity-association.json"
    else
        echo "  https://$PUBLISHER_DOMAIN/.well-known/microsoft-identity-association.json"
    fi
else
    echo "  https://$PUBLISHER_DOMAIN/.well-known/microsoft-identity-association.json"
fi
echo ""
echo "• After manual setup, use check-publisher-domain.sh to verify"
echo "• Benefits: Removes 'unverified' warnings in consent screens"

echo -e "\n${GREEN}✅ Prerequisites validated - ready for manual Azure Portal setup!${NC}" 