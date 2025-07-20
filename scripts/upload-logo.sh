#!/bin/bash

# Upload logo to Azure AD Application via Microsoft Graph API
# Usage: ./upload-logo.sh [APPLICATION_ID] [LOGO_FILE_PATH]

set -e

LOGO_FILE="${1:-public/assets/logo.png}"
APPLICATION_ID="${2:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🖼️  Azure AD Application Logo Uploader${NC}"
echo "=================================="

# Check if logo file exists
if [ ! -f "$LOGO_FILE" ]; then
    echo -e "${RED}❌ Logo file not found: $LOGO_FILE${NC}"
    echo "💡 Generate a logo first: ./scripts/generate-logo.sh"
    exit 1
fi

# Get file info
FILE_SIZE=$(stat -f%z "$LOGO_FILE" 2>/dev/null || stat -c%s "$LOGO_FILE" 2>/dev/null || echo "0")
FILE_SIZE_KB=$((FILE_SIZE / 1024))

echo -e "${BLUE}📁 Logo file: $LOGO_FILE${NC}"
echo -e "${BLUE}📏 File size: ${FILE_SIZE_KB}KB${NC}"

# Check file size (Azure AD limit is 256KB)
if [ $FILE_SIZE_KB -gt 256 ]; then
    echo -e "${RED}❌ Logo file exceeds 256KB limit (current: ${FILE_SIZE_KB}KB)${NC}"
    exit 1
fi

# If APPLICATION_ID not provided, try to get it from terraform output
if [ -z "$APPLICATION_ID" ]; then
    echo -e "${YELLOW}🔍 Getting Application ID from Terraform...${NC}"
    if [ -f "terraform/terraform.tfstate" ]; then
        APPLICATION_ID=$(cd terraform && terraform output -raw application_client_id 2>/dev/null || echo "")
    fi
    
    if [ -z "$APPLICATION_ID" ]; then
        echo -e "${RED}❌ APPLICATION_ID not found. Please provide it as an argument:${NC}"
        echo "   ./scripts/upload-logo.sh [APPLICATION_ID] [LOGO_FILE]"
        echo ""
        echo -e "${YELLOW}💡 You can find your Application ID:${NC}"
        echo "   - Azure Portal → App registrations → Your app → Overview"
        echo "   - Or run: cd terraform && terraform output application_client_id"
        exit 1
    fi
fi

echo -e "${BLUE}🔑 Application ID: $APPLICATION_ID${NC}"

# Check if Azure CLI is available and logged in
if ! command -v az >/dev/null 2>&1; then
    echo -e "${RED}❌ Azure CLI not found. Please install it first.${NC}"
    exit 1
fi

# Check if logged in
if ! az account show >/dev/null 2>&1; then
    echo -e "${RED}❌ Not logged in to Azure CLI. Please run: az login${NC}"
    exit 1
fi

echo -e "${YELLOW}🔄 Getting access token...${NC}"
ACCESS_TOKEN=$(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Failed to get access token${NC}"
    exit 1
fi

echo -e "${YELLOW}📤 Uploading logo to Azure AD Application...${NC}"

# Upload logo using Microsoft Graph API
HTTP_STATUS=$(curl -w "%{http_code}" -s -o /tmp/upload_response.json \
    -X PUT \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: image/png" \
    --data-binary "@$LOGO_FILE" \
    "https://graph.microsoft.com/v1.0/applications(appId='$APPLICATION_ID')/logo")

if [ "$HTTP_STATUS" = "204" ] || [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Logo uploaded successfully!${NC}"
    echo ""
    echo -e "${GREEN}🎯 Next steps:${NC}"
    echo "1. The logo will appear in Azure AD consent screens"
    echo "2. It may take a few minutes to propagate"
    echo "3. Check Azure Portal → App registrations → Your app → Branding"
    echo ""
    echo -e "${BLUE}🔗 View in Azure Portal:${NC}"
    echo "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Branding/appId/$APPLICATION_ID"
else
    echo -e "${RED}❌ Upload failed with HTTP status: $HTTP_STATUS${NC}"
    echo -e "${RED}Response:${NC}"
    cat /tmp/upload_response.json 2>/dev/null || echo "No response body"
    
    echo ""
    echo -e "${YELLOW}💡 Common issues:${NC}"
    echo "- Insufficient permissions (need Application.ReadWrite.All)"
    echo "- Invalid Application ID"
    echo "- File too large (>256KB) or wrong format"
    echo "- Need admin consent for the Microsoft Graph API"
    exit 1
fi

# Cleanup
rm -f /tmp/upload_response.json 