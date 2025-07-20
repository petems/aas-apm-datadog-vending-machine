#!/bin/bash

# Check Publisher Domain Status for Azure AD Application
# This script checks the current publisher domain configuration and verification status
# Usage: ./check-publisher-domain.sh [APPLICATION_ID]

set -e

# Parse arguments
APPLICATION_ID="${1:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Azure AD Publisher Domain Status Checker${NC}"
echo "============================================="

# Get application ID from Terraform if not provided
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
        echo -e "${YELLOW}💡 Please provide the Application ID manually:${NC}"
        echo "  $0 12345678-1234-1234-1234-123456789012"
        exit 1
    fi
fi

# Validate Application ID format (UUID)
if ! echo "$APPLICATION_ID" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; then
    echo -e "${RED}❌ Invalid Application ID format. Must be a valid UUID.${NC}"
    exit 1
fi

echo -e "\n${CYAN}📋 Application ID: $APPLICATION_ID${NC}"

# Check if Azure CLI is installed and authenticated
if ! command -v az >/dev/null 2>&1; then
    echo -e "${RED}❌ Azure CLI is not installed${NC}"
    echo -e "${YELLOW}💡 Install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli${NC}"
    exit 1
fi

# Check Azure CLI authentication
if ! az account show >/dev/null 2>&1; then
    echo -e "${RED}❌ Not authenticated with Azure CLI${NC}"
    echo -e "${YELLOW}💡 Please run: az login${NC}"
    exit 1
fi

# Get current application details
echo -e "\n${CYAN}🔍 Fetching application details...${NC}"
CURRENT_APP=$(az rest --method GET \
    --url "https://graph.microsoft.com/v1.0/applications?$filter=appId eq '$APPLICATION_ID'" \
    --headers "Content-Type=application/json" 2>/dev/null || echo "")

if [ -z "$CURRENT_APP" ] || ! echo "$CURRENT_APP" | grep -q '"value"'; then
    echo -e "${RED}❌ Could not retrieve application details${NC}"
    echo -e "${YELLOW}💡 Make sure the Application ID is correct and you have proper permissions${NC}"
    exit 1
fi

# Extract application details with robust JSON parsing
if command -v jq >/dev/null 2>&1; then
    APPLICATION_OBJECT_ID=$(echo "$CURRENT_APP" | jq -r '.value[0].id // empty' 2>/dev/null)
    APP_NAME=$(echo "$CURRENT_APP" | jq -r '.value[0].displayName // empty' 2>/dev/null)
    CURRENT_DOMAIN=$(echo "$CURRENT_APP" | jq -r '.value[0].publisherDomain // empty' 2>/dev/null)
    VERIFICATION_STATUS=$(echo "$CURRENT_APP" | jq -r '.value[0].isVerified // false' 2>/dev/null)
else
    # Fallback to sed if jq is not available
    APPLICATION_OBJECT_ID=$(echo "$CURRENT_APP" | sed -n 's/.*"value":\[\{.*"id":"\([^"]*\)".*/\1/p' | head -1)
    APP_NAME=$(echo "$CURRENT_APP" | sed -n 's/.*"displayName":"\([^"]*\)".*/\1/p' | head -1)
    CURRENT_DOMAIN=$(echo "$CURRENT_APP" | sed -n 's/.*"publisherDomain":"\([^"]*\)".*/\1/p' | head -1)
    VERIFICATION_STATUS=$(echo "$CURRENT_APP" | sed -n 's/.*"isVerified":\([^,}]*\).*/\1/p' | head -1)
fi

# Ensure we have values or set defaults
[ -z "$APP_NAME" ] && APP_NAME="(unknown)"
[ -z "$CURRENT_DOMAIN" ] && CURRENT_DOMAIN=""
[ -z "$VERIFICATION_STATUS" ] && VERIFICATION_STATUS="false"

echo -e "\n${CYAN}📊 Application Details:${NC}"
echo "  Name: $APP_NAME"
echo "  Object ID: $APPLICATION_OBJECT_ID"
echo "  Publisher Domain: ${CURRENT_DOMAIN:-"(not set)"}"
echo "  Verification Status: $VERIFICATION_STATUS"

# If domain is set, check verification file
if [ -n "$CURRENT_DOMAIN" ] && [ "$CURRENT_DOMAIN" != "null" ]; then
    echo -e "\n${CYAN}🔍 Checking domain verification file...${NC}"
    
    # For GitHub Pages, check if we need to include repository path
    VERIFICATION_URL="https://${CURRENT_DOMAIN}/.well-known/microsoft-identity-association.json"
    
    # If this is a GitHub Pages domain, also try with common repository path patterns
    if echo "$CURRENT_DOMAIN" | grep -q "\.github\.io$"; then
        echo "Detected GitHub Pages domain, checking multiple locations..."
        
        # Try the root domain first
        echo "Checking root: $VERIFICATION_URL"
        if command -v curl >/dev/null 2>&1; then
            VERIFICATION_RESPONSE=$(curl -s -f "$VERIFICATION_URL" 2>/dev/null || echo "")
            if [ -z "$VERIFICATION_RESPONSE" ]; then
                # Try with repository name from terraform state
                if [ -f "terraform/terraform.tfvars" ]; then
                    REPO_NAME=$(grep -E "github_repository.*=" terraform/terraform.tfvars | cut -d'"' -f2 2>/dev/null || echo "")
                    if [ -n "$REPO_NAME" ]; then
                        VERIFICATION_URL="https://${CURRENT_DOMAIN}/${REPO_NAME}/.well-known/microsoft-identity-association.json"
                        echo "Trying with repository path: $VERIFICATION_URL"
                    fi
                fi
            fi
        fi
    else
        echo "Checking: $VERIFICATION_URL"
    fi
    
    if command -v curl >/dev/null 2>&1; then
        VERIFICATION_RESPONSE=$(curl -s -f "$VERIFICATION_URL" 2>/dev/null || echo "")
        if [ -n "$VERIFICATION_RESPONSE" ]; then
            echo -e "${GREEN}✅ Verification file is accessible${NC}"
            
            if echo "$VERIFICATION_RESPONSE" | grep -q "$APPLICATION_ID"; then
                echo -e "${GREEN}✅ File contains correct Application ID${NC}"
            else
                echo -e "${RED}❌ File does NOT contain the correct Application ID${NC}"
                echo -e "${YELLOW}📄 Current file content:${NC}"
                echo "$VERIFICATION_RESPONSE" | head -10
            fi
        else
            echo -e "${RED}❌ Verification file is NOT accessible${NC}"
            echo -e "${YELLOW}💡 File should be available at: $VERIFICATION_URL${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  curl not available, cannot check verification file${NC}"
    fi
else
    echo -e "\n${YELLOW}📝 No publisher domain is currently set${NC}"
fi

# Show Azure Portal links
echo -e "\n${CYAN}🔗 Useful Links:${NC}"
echo "• Azure Portal (Overview): https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/$APPLICATION_ID"
echo "• Azure Portal (Branding): https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Branding/appId/$APPLICATION_ID"

# Show status summary
echo -e "\n${CYAN}📋 Status Summary:${NC}"
if [ -n "$CURRENT_DOMAIN" ] && [ "$CURRENT_DOMAIN" != "null" ]; then
    if [ "$VERIFICATION_STATUS" = "true" ]; then
        echo -e "${GREEN}✅ Publisher domain is set and verified${NC}"
        echo "   Domain: $CURRENT_DOMAIN"
    else
        echo -e "${YELLOW}⚠️  Publisher domain is set but may not be fully verified${NC}"
        echo "   Domain: $CURRENT_DOMAIN"
        echo -e "${YELLOW}💡 Run verification process in Azure Portal or use update script${NC}"
    fi
else
    echo -e "${YELLOW}📝 No publisher domain configured${NC}"
    echo -e "${YELLOW}💡 Use the update-publisher-domain.sh script to set one${NC}"
fi

echo -e "\n${GREEN}✅ Status check completed!${NC}" 