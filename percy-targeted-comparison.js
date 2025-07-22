const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureTerminalScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🚀 Capturing targeted terminal screenshots...');
    
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Create screenshots directory
    const screenshotsDir = path.join(__dirname, 'percy-targeted-screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }
    
    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'full-page.png'),
      fullPage: true
    });
    console.log('✅ Captured full page screenshot');
    
    // Find all sections with terminals
    const allSections = await page.$$('.bg-gray-50, .bg-blue-50');
    console.log(`🔍 Found ${allSections.length} sections`);
    
    for (let i = 0; i < allSections.length; i++) {
      const section = allSections[i];
      
      // Get section class to identify type
      const sectionClass = await section.evaluate(el => el.className);
      console.log(`📋 Section ${i + 1} classes: ${sectionClass}`);
      
      // Scroll to section
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      // Capture section screenshot
      await section.screenshot({
        path: path.join(screenshotsDir, `section-${i + 1}.png`)
      });
      console.log(`✅ Captured section ${i + 1}`);
      
      // Look for terminal within this section
      const terminal = await section.$('.bg-gray-900');
      if (terminal) {
        await terminal.screenshot({
          path: path.join(screenshotsDir, `terminal-${i + 1}.png`)
        });
        console.log(`✅ Captured terminal ${i + 1}`);
        
        // Get terminal info
        const terminalInfo = await terminal.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            maxWidth: computed.maxWidth,
            fontSize: computed.fontSize,
            width: computed.width,
            height: computed.height,
            className: el.className
          };
        });
        console.log(`📏 Terminal ${i + 1} info:`, terminalInfo);
      } else {
        console.log(`ℹ️  No terminal found in section ${i + 1}`);
      }
    }
    
    // Specifically look for the Datadog CI CLI section
    const datadogSections = await page.$$('.bg-blue-50.border.border-blue-200.rounded-lg');
    console.log(`🔍 Found ${datadogSections.length} Datadog CI sections`);
    
    for (let i = 0; i < datadogSections.length; i++) {
      const section = datadogSections[i];
      
      // Get section text to identify the CLI section
      const sectionText = await section.evaluate(el => el.textContent);
      if (sectionText.includes('datadog-ci') || sectionText.includes('CLI')) {
        console.log(`🎯 Found Datadog CI CLI section ${i + 1}`);
        
        await section.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        
        await section.screenshot({
          path: path.join(screenshotsDir, `datadog-cli-section-${i + 1}.png`)
        });
        console.log(`✅ Captured Datadog CI CLI section ${i + 1}`);
        
        // Look for terminal
        const terminal = await section.$('.bg-gray-900');
        if (terminal) {
          await terminal.screenshot({
            path: path.join(screenshotsDir, `datadog-cli-terminal-${i + 1}.png`)
          });
          console.log(`✅ Captured Datadog CI CLI terminal ${i + 1}`);
        }
      }
    }
    
    // Look for Azure auth section specifically
    const azureSections = await page.$$('.bg-gray-50.border.border-gray-200.rounded-lg');
    console.log(`🔍 Found ${azureSections.length} Azure auth sections`);
    
    for (let i = 0; i < azureSections.length; i++) {
      const section = azureSections[i];
      
      const sectionText = await section.evaluate(el => el.textContent);
      if (sectionText.includes('Azure') || sectionText.includes('access token')) {
        console.log(`🎯 Found Azure auth section ${i + 1}`);
        
        await section.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        
        await section.screenshot({
          path: path.join(screenshotsDir, `azure-auth-section-${i + 1}.png`)
        });
        console.log(`✅ Captured Azure auth section ${i + 1}`);
        
        // Look for terminal
        const terminal = await section.$('.bg-gray-900');
        if (terminal) {
          await terminal.screenshot({
            path: path.join(screenshotsDir, `azure-auth-terminal-${i + 1}.png`)
          });
          console.log(`✅ Captured Azure auth terminal ${i + 1}`);
        } else {
          console.log(`ℹ️  No terminal in Azure auth section ${i + 1} (as expected in feature branch)`);
        }
      }
    }
    
    console.log('\n✅ All targeted screenshots captured successfully!');
    console.log(`📁 Screenshots saved in: ${screenshotsDir}`);
    
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the screenshot capture
captureTerminalScreenshots().catch(console.error);