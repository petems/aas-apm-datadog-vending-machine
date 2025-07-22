const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureTerminalScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🚀 Capturing terminal screenshots...');
    
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Create screenshots directory
    const screenshotsDir = path.join(__dirname, 'percy-terminal-screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }
    
    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'full-page.png'),
      fullPage: true
    });
    console.log('✅ Captured full page screenshot');
    
    // Find and capture the Azure auth section (if it exists)
    const azureSection = await page.$('.bg-gray-50');
    if (azureSection) {
      await azureSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      await azureSection.screenshot({
        path: path.join(screenshotsDir, 'azure-auth-section.png')
      });
      console.log('✅ Captured Azure auth section');
      
      // Check if there's a terminal in the Azure section
      const azureTerminal = await azureSection.$('.bg-gray-900');
      if (azureTerminal) {
        await azureTerminal.screenshot({
          path: path.join(screenshotsDir, 'azure-auth-terminal.png')
        });
        console.log('✅ Captured Azure auth terminal');
      } else {
        console.log('ℹ️  No terminal found in Azure auth section (as expected in feature branch)');
      }
    } else {
      console.log('⚠️  Azure auth section not found');
    }
    
    // Find and capture the Datadog CI section
    const datadogSection = await page.$('.bg-blue-50');
    if (datadogSection) {
      await datadogSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      await datadogSection.screenshot({
        path: path.join(screenshotsDir, 'datadog-ci-section.png')
      });
      console.log('✅ Captured Datadog CI section');
      
      // Capture the terminal in the Datadog section
      const datadogTerminal = await datadogSection.$('.bg-gray-900');
      if (datadogTerminal) {
        await datadogTerminal.screenshot({
          path: path.join(screenshotsDir, 'datadog-ci-terminal.png')
        });
        console.log('✅ Captured Datadog CI terminal');
        
        // Get terminal dimensions for comparison
        const terminalBox = await datadogTerminal.boundingBox();
        console.log(`📏 Terminal dimensions: ${terminalBox.width}x${terminalBox.height}`);
        
        // Get computed styles for comparison
        const styles = await datadogTerminal.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            maxWidth: computed.maxWidth,
            fontSize: computed.fontSize,
            width: computed.width
          };
        });
        console.log(`🎨 Terminal styles: max-width=${styles.maxWidth}, font-size=${styles.fontSize}, width=${styles.width}`);
      } else {
        console.log('⚠️  Datadog CI terminal not found');
      }
    } else {
      console.log('⚠️  Datadog CI section not found');
    }
    
    // Capture any other terminal-like elements
    const allTerminals = await page.$$('.bg-gray-900.font-mono');
    console.log(`🔍 Found ${allTerminals.length} terminal elements`);
    
    for (let i = 0; i < allTerminals.length; i++) {
      const terminal = allTerminals[i];
      await terminal.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      await terminal.screenshot({
        path: path.join(screenshotsDir, `terminal-${i + 1}.png`)
      });
      console.log(`✅ Captured terminal ${i + 1}`);
    }
    
    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Screenshots saved in: ${screenshotsDir}`);
    
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the screenshot capture
captureTerminalScreenshots().catch(console.error);