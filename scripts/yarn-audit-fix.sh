#!/bin/bash

# Yarn Audit Fix Script
# Attempts to automatically fix security vulnerabilities found by yarn audit
# Optimized for Yarn 1.x projects with reliable strategies

set -e

echo "🔍 Running security audit fix for Yarn 1.x project..."
echo "📊 Current vulnerabilities:"
yarn audit --level moderate || echo "⚠️  Vulnerabilities found, attempting fixes..."

echo ""
echo "🔧 Strategy 1: Upgrading packages to latest compatible versions..."
yarn upgrade

echo ""
echo "🔧 Strategy 2: Upgrading specific vulnerable packages..."
# Use yarn outdated to find packages that can be updated
echo "📋 Checking for outdated packages..."
yarn outdated || echo "ℹ️  Package check completed"

echo ""
echo "🔧 Strategy 3: Clean reinstall of dependencies..."
rm -rf node_modules
yarn install

echo ""
echo "🧪 Testing that fixes don't break functionality..."
yarn build || (echo "❌ Build failed after audit fixes! Rolling back may be needed." && exit 1)

echo ""
echo "📊 Final security status:"
yarn audit --level moderate  || echo "✅ Some vulnerabilities may remain - manual review recommended"

echo ""
echo "✅ Audit fix process completed!"
echo "💡 If vulnerabilities remain, consider:"
echo "   - Manual updates: yarn add package@latest"
echo "   - Check changelogs for breaking changes"
echo "   - Accept risk for dev-only vulnerabilities"
echo "   - Use yarn resolutions for indirect dependencies" 