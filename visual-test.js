const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureTerminalScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🚀 Starting visual testing of terminal components...');
    
    // Set viewport to capture the terminal components properly
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Create screenshots directory if it doesn't exist
    const screenshotsDir = path.join(__dirname, 'screenshots-master');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }
    
    // Take a full page screenshot
    console.log('📸 Taking full page screenshot...');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'full-page-terminal.png'),
      fullPage: true 
    });
    
    // Find and capture the Datadog CI CLI terminal section
    console.log('📸 Taking terminal section screenshot...');
    const terminalSection = await page.locator('.bg-blue-50').first();
    if (await terminalSection.count() > 0) {
      await terminalSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000); // Wait for scroll animation
      
      await terminalSection.screenshot({ 
        path: path.join(screenshotsDir, 'datadog-cli-terminal.png') 
      });
    }
    
    // Find and capture the Azure Access Token section (without terminal)
    console.log('📸 Taking Azure Access Token section screenshot...');
    const azureSection = await page.locator('.bg-gray-50').first();
    if (await azureSection.count() > 0) {
      await azureSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      await azureSection.screenshot({ 
        path: path.join(screenshotsDir, 'azure-access-token-section.png') 
      });
    }
    
    // Take a screenshot of the entire form area
    console.log('📸 Taking form area screenshot...');
    const formArea = await page.locator('form').first();
    if (await formArea.count() > 0) {
      await formArea.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      await formArea.screenshot({ 
        path: path.join(screenshotsDir, 'form-area.png') 
      });
    }
    
    console.log('✅ Screenshots captured successfully!');
    console.log('📁 Screenshots saved in:', screenshotsDir);
    
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

// Run the visual testing
captureTerminalScreenshots();