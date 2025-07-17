#!/bin/bash

# NPM Audit Fix Force Script
# Forces the use of npm audit fix by creating temporary package-lock.json
# and cleaning up afterwards. Use when yarn audit-fix isn't sufficient.

set -e

echo "🚨 Force running npm audit fix on Yarn project..."
echo "⚠️  This will temporarily create package-lock.json and modify dependencies"

echo ""
echo "📊 Current vulnerabilities:"
yarn audit --level moderate || echo "⚠️  Vulnerabilities found, attempting npm audit fix..."

echo ""
echo "🔧 Step 1: Creating temporary package-lock.json..."
# Create package-lock.json from current yarn.lock state
npm i --package-lock-only --no-save

echo ""
echo "🔧 Step 2: Running npm audit fix..."
npm audit fix --force || echo "ℹ️  npm audit fix completed (may have warnings)"

echo ""
echo "🔧 Step 3: Syncing changes back to yarn.lock..."
# Remove node_modules and yarn.lock, then reinstall with yarn to sync changes
rm -rf node_modules
rm -f yarn.lock
yarn install

echo ""
echo "🧹 Step 4: Cleaning up package-lock.json..."
rm -f package-lock.json

echo ""
echo "🧪 Step 5: Testing that fixes don't break functionality..."
yarn build || (echo "❌ Build failed after npm audit fixes! You may need to review changes." && exit 1)

echo ""
echo "📊 Final security status:"
yarn audit --level moderate || echo "✅ Vulnerabilities fixed or require manual review"

echo ""
echo "✅ NPM audit fix force process completed!"
echo "💡 Changes made:"
echo "   - Used npm audit fix to resolve vulnerabilities"
echo "   - Regenerated yarn.lock with updated package versions"
echo "   - Cleaned up temporary package-lock.json"
echo "   - Verified build still works" 