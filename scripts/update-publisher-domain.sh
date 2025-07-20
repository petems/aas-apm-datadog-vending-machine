#!/bin/bash

# Update Publisher Domain for Azure AD Application
# This script sets the publisher domain for an Azure AD application after verifying domain ownership
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

echo -e "${BLUE}🔗 Azure AD Publisher Domain Updater${NC}"
echo "======================================="

# Function to show usage
show_usage() {
    echo -e "\n${YELLOW}Usage:${NC}"
    echo "  $0 [APPLICATION_ID] [DOMAIN]"
    echo ""
    echo -e "${YELLOW}Arguments:${NC}"
    echo "  APPLICATION_ID    Azure AD Application (Client) ID"
    echo "  DOMAIN           Publisher domain to set (e.g., example.com)"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 12345678-1234-1234-1234-123456789012 example.com"
    echo "  $0 auto petems.github.io"
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

# Validate domain format (basic check)
if ! echo "$PUBLISHER_DOMAIN" | grep -qE '^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$'; then
    echo -e "${RED}❌ Invalid domain format: $PUBLISHER_DOMAIN${NC}"
    echo -e "${YELLOW}💡 Domain should be like: example.com, subdomain.example.com${NC}"
    exit 1
fi

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

VERIFICATION_URL="https://${PUBLISHER_DOMAIN}/.well-known/microsoft-identity-association.json"
echo "Checking: $VERIFICATION_URL"

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
        echo -e "${YELLOW}📝 Make sure this file exists and is publicly accessible:${NC}"
        echo "   $VERIFICATION_URL"
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

# Update publisher domain via Microsoft Graph API
echo -e "\n${CYAN}🚀 Updating publisher domain...${NC}"

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
APPLICATION_OBJECT_ID=$(echo "$CURRENT_APP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
CURRENT_DOMAIN=$(echo "$CURRENT_APP" | grep -o '"publisherDomain":"[^"]*"' | cut -d'"' -f4 || echo "none")

echo "  Application Object ID: $APPLICATION_OBJECT_ID"
echo "  Current Publisher Domain: ${CURRENT_DOMAIN:-"(not set)"}"

if [ -z "$APPLICATION_OBJECT_ID" ]; then
    echo -e "${RED}❌ Could not extract application object ID${NC}"
    exit 1
fi

# Update the publisher domain
echo "Setting publisher domain to: $PUBLISHER_DOMAIN"

UPDATE_RESULT=$(az rest --method PATCH \
    --url "https://graph.microsoft.com/v1.0/applications/$APPLICATION_OBJECT_ID" \
    --headers "Content-Type=application/json" \
    --body "{\"publisherDomain\": \"$PUBLISHER_DOMAIN\"}" 2>&1 || echo "ERROR")

if echo "$UPDATE_RESULT" | grep -qi "error"; then
    echo -e "${RED}❌ Failed to update publisher domain${NC}"
    echo -e "${YELLOW}Error details:${NC}"
    echo "$UPDATE_RESULT"
    echo ""
    echo -e "${YELLOW}💡 Common issues:${NC}"
    echo "  • Domain not verified - ensure verification file is accessible"
    echo "  • Insufficient permissions - need Application.ReadWrite.All or Application.ReadWrite.OwnedBy"
    echo "  • Invalid domain format"
    exit 1
fi

# Verify the update
echo -e "\n${CYAN}✅ Verifying update...${NC}"
sleep 2  # Give Azure a moment to process

UPDATED_APP=$(az rest --method GET \
    --url "https://graph.microsoft.com/v1.0/applications/$APPLICATION_OBJECT_ID" \
    --headers "Content-Type=application/json" 2>/dev/null || echo "")

if [ -n "$UPDATED_APP" ]; then
    NEW_DOMAIN=$(echo "$UPDATED_APP" | grep -o '"publisherDomain":"[^"]*"' | cut -d'"' -f4 || echo "none")
    if [ "$NEW_DOMAIN" = "$PUBLISHER_DOMAIN" ]; then
        echo -e "${GREEN}🎉 Publisher domain successfully updated!${NC}"
        echo "  ✅ New Publisher Domain: $NEW_DOMAIN"
    else
        echo -e "${YELLOW}⚠️  Update completed but verification shows different domain: $NEW_DOMAIN${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not verify update (API call failed)${NC}"
fi

# Show Azure Portal link
PORTAL_URL="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Branding/appId/$APPLICATION_ID"
echo -e "\n${CYAN}🔗 Next Steps:${NC}"
echo "1. Verify the change in Azure Portal:"
echo "   $PORTAL_URL"
echo ""
echo "2. Test the consent screen to see the verified publisher domain"
echo ""
echo "3. The domain verification file must remain accessible at:"
echo "   https://$PUBLISHER_DOMAIN/.well-known/microsoft-identity-association.json"

echo -e "\n${GREEN}✅ Publisher domain update completed!${NC}" 