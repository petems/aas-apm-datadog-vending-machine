#!/bin/bash

# Generate a logo for the Datadog APM Vending Machine
# Uses shields.io for text generation and imagemagick for sizing

set -e

LOGO_DIR="public/assets"
LOGO_FILE="$LOGO_DIR/logo.png"

# Create assets directory if it doesn't exist
mkdir -p "$LOGO_DIR"

echo "🎨 Generating logo for Datadog APM Vending Machine..."

# Method 1: Simple shield-style logo
SHIELD_URL="https://img.shields.io/badge/Datadog%20APM-Vending%20Machine-663399?style=for-the-badge&logo=datadog&logoColor=white"

# Download the shield
echo "📥 Downloading base logo..."
curl -s "$SHIELD_URL" -o "$LOGO_DIR/logo_base.svg"

# Check if imagemagick is available
if command -v convert >/dev/null 2>&1; then
    echo "🔄 Converting to PNG and resizing to 215x215px..."
    
    # Convert SVG to PNG with proper sizing
    convert "$LOGO_DIR/logo_base.svg" \
        -background transparent \
        -resize 215x215 \
        -gravity center \
        -extent 215x215 \
        "$LOGO_FILE"
    
    # Check file size (Azure AD limit is 256KB)
    SIZE=$(stat -f%z "$LOGO_FILE" 2>/dev/null || stat -c%s "$LOGO_FILE" 2>/dev/null || echo "0")
    SIZE_KB=$((SIZE / 1024))
    
    echo "✅ Logo generated: $LOGO_FILE"
    echo "📏 Size: ${SIZE_KB}KB (limit: 256KB)"
    
    if [ $SIZE_KB -gt 256 ]; then
        echo "⚠️  Warning: Logo exceeds 256KB limit. Compressing..."
        convert "$LOGO_FILE" -quality 85 "$LOGO_FILE"
        SIZE=$(stat -f%z "$LOGO_FILE" 2>/dev/null || stat -c%s "$LOGO_FILE" 2>/dev/null)
        SIZE_KB=$((SIZE / 1024))
        echo "✅ Compressed to: ${SIZE_KB}KB"
    fi
    
    # Clean up temporary file
    rm -f "$LOGO_DIR/logo_base.svg"
    
else
    echo "❌ ImageMagick not found. Installing..."
    echo "   macOS: brew install imagemagick"
    echo "   Ubuntu: sudo apt-get install imagemagick"
    echo "   Alternative: Use online converter for $LOGO_DIR/logo_base.svg"
    exit 1
fi

echo ""
echo "🎯 Logo ready for use!"
echo "📁 Location: $LOGO_FILE"
echo "🌐 To use in Terraform, host this file and update terraform.tfvars:"
echo "   app_logo_url = \"https://yourdomain.com/path/to/logo.png\""
echo ""
echo "💡 Hosting options:"
echo "   - GitHub Pages: Copy to public/ directory"
echo "   - GitHub raw: Upload to repo and use raw.githubusercontent.com URL"
echo "   - CDN: Upload to any HTTPS-accessible location" 