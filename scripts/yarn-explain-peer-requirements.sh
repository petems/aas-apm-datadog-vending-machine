#!/bin/bash

# yarn-explain-peer-requirements.sh
# Alternative to "yarn explain peer-requirements" for Yarn 1.x

echo "🔍 Yarn Peer Requirements Checker (Yarn 1.x Compatible)"
echo "=================================================="
echo ""

echo "ℹ️  Note: 'yarn explain peer-requirements' is only available in Yarn 2+."
echo "   This script provides equivalent functionality for Yarn 1.x projects."
echo ""

echo "📦 Checking Yarn version..."
yarn --version
echo ""

echo "🔍 Checking for peer dependency issues..."
echo ""

# Check if check-peer-dependencies is available
if command -v npx &> /dev/null; then
    echo "Running peer dependency analysis..."
    npx check-peer-dependencies
    echo ""
    
    echo "💡 To get solutions:"
    echo "   npx check-peer-dependencies --findSolutions"
    echo ""
    
    echo "⚡ To auto-install (use with caution):"
    echo "   npx check-peer-dependencies --install"
    echo ""
else
    echo "❌ npx not available. Install Node.js/npm to use check-peer-dependencies."
fi

echo "🔍 Yarn install warnings (alternative method):"
echo "Running 'yarn install' to show peer dependency warnings..."
echo ""

yarn install 2>&1 | grep -i "warning.*peer\|unmet peer" || echo "✅ No peer dependency warnings found!"

echo ""
echo "📚 For more information, see: PEER_DEPENDENCIES_GUIDE.md"
echo ""
echo "🚀 Alternative: Upgrade to Yarn 2+ to use 'yarn explain peer-requirements'"
echo "   yarn set version berry"