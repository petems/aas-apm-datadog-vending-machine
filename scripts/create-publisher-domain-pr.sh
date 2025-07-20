#!/bin/bash

# Create Pull Request for Publisher Domain Verification
# This script creates a PR to add the verification file to your root GitHub Pages repository
# Usage: ./create-publisher-domain-pr.sh [APPLICATION_ID] [ROOT_REPO]

set -e

# Parse arguments
APPLICATION_ID="${1:-}"
ROOT_REPO="${2:-petems.github.io}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔗 Publisher Domain Verification PR Creator${NC}"
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
        echo -e "${YELLOW}💡 Please provide the Application ID manually${NC}"
        exit 1
    fi
fi

# Validate Application ID format (UUID)
if ! echo "$APPLICATION_ID" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; then
    echo -e "${RED}❌ Invalid Application ID format. Must be a valid UUID.${NC}"
    exit 1
fi

echo -e "\n${CYAN}📋 Configuration:${NC}"
echo "  Application ID: $APPLICATION_ID"
echo "  Root Repository: $ROOT_REPO"

# Check if GitHub CLI is installed
if ! command -v gh >/dev/null 2>&1; then
    echo -e "\n${RED}❌ GitHub CLI is not installed${NC}"
    echo -e "${YELLOW}💡 Install it from: https://cli.github.com/manual/installation${NC}"
    exit 1
fi

# Check GitHub CLI authentication
echo -e "\n${CYAN}🔐 Checking GitHub CLI authentication...${NC}"
if ! gh auth status >/dev/null 2>&1; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI${NC}"
    echo -e "${YELLOW}💡 Please run: gh auth login${NC}"
    exit 1
fi

CURRENT_USER=$(gh api user --jq '.login' 2>/dev/null || echo "Unknown")
echo -e "${GREEN}✅ Authenticated as: $CURRENT_USER${NC}"

# Create verification file content
VERIFICATION_CONTENT=$(cat << EOF
{
  "associatedApplications": [
    {
      "applicationId": "$APPLICATION_ID"
    }
  ]
}
EOF
)

echo -e "\n${CYAN}📄 Verification file content:${NC}"
echo "$VERIFICATION_CONTENT"

# Create temporary directory for the work
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo -e "\n${CYAN}🔄 Creating pull request...${NC}"

# Clone the repository
echo "Cloning repository: $ROOT_REPO"
gh repo clone "$ROOT_REPO" .

# Create a new branch
BRANCH_NAME="azure-ad-publisher-domain-verification"
git checkout -b "$BRANCH_NAME"

# Create the .well-known directory and verification file
mkdir -p .well-known
echo "$VERIFICATION_CONTENT" > .well-known/microsoft-identity-association.json

# Add and commit the file
git add .well-known/microsoft-identity-association.json
git commit -m "Add Azure AD publisher domain verification file

This file enables publisher domain verification for Azure AD applications,
removing 'unverified' warnings from consent screens.

Application ID: $APPLICATION_ID
Verification URL: https://${ROOT_REPO#*/}/.well-known/microsoft-identity-association.json

See: https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-configure-publisher-domain"

# Push the branch
git push origin "$BRANCH_NAME"

# Create the pull request
PR_TITLE="Add Azure AD publisher domain verification file"
PR_BODY="## Publisher Domain Verification

This PR adds the Microsoft identity association file required for Azure AD publisher domain verification.

### 📋 Details
- **Application ID**: \`$APPLICATION_ID\`
- **Verification File**: \`.well-known/microsoft-identity-association.json\`
- **Purpose**: Removes 'unverified' warnings from Azure AD consent screens

### 🔗 Verification URL
After merging, the verification file will be accessible at:
https://${ROOT_REPO#*/}/.well-known/microsoft-identity-association.json

### 📚 Documentation
- [Publisher verification overview](https://docs.microsoft.com/en-us/azure/active-directory/develop/publisher-verification-overview)
- [Configure publisher domain](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-configure-publisher-domain)

### ✅ Next Steps
1. Merge this PR
2. In Azure Portal → App registrations → Branding:
   - Set publisher domain to: \`${ROOT_REPO#*/}\`
   - Azure will automatically verify using this file"

PR_URL=$(gh pr create --title "$PR_TITLE" --body "$PR_BODY" --head "$BRANCH_NAME")

# Clean up
cd - >/dev/null
rm -rf "$TEMP_DIR"

echo -e "\n${GREEN}🎉 Pull request created successfully!${NC}"
echo -e "${CYAN}🔗 PR URL: $PR_URL${NC}"

echo -e "\n${CYAN}📋 Next Steps:${NC}"
echo "1. Review and merge the pull request: $PR_URL"
echo "2. After merging, the verification file will be available at:"
echo "   https://${ROOT_REPO#*/}/.well-known/microsoft-identity-association.json"
echo "3. In Azure Portal, set publisher domain to: ${ROOT_REPO#*/}"
echo "4. Azure will automatically verify the domain using the deployed file"

echo -e "\n${GREEN}✅ Publisher domain verification PR created successfully!${NC}" 