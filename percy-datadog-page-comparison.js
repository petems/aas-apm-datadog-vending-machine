const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureDatadogPageScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🚀 Capturing Datadog configuration page screenshots...');
    
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Click on the Direct Configuration option to navigate to the Datadog page
    console.log('🔍 Looking for Direct Configuration option...');
    
    // Try to find and click the Direct Configuration button
    const directConfigButton = await page.$('text=Direct Configuration');
    if (directConfigButton) {
      console.log('✅ Found Direct Configuration button, clicking...');
      await directConfigButton.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('⚠️  Direct Configuration button not found, trying alternative...');
      
      // Try alternative selectors
      const altButton = await page.$('[class*="Direct Configuration"]');
      if (altButton) {
        console.log('✅ Found alternative Direct Configuration button, clicking...');
        await altButton.click();
        await page.waitForTimeout(3000);
      } else {
        console.log('⚠️  Could not find Direct Configuration button');
      }
    }
    
    // Get current branch name
    const branchName = process.env.GIT_BRANCH || 'unknown';
    const screenshotsDir = path.join(__dirname, `percy-datadog-page-${branchName.replace(/\//g, '-')}`);
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }
    
    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'datadog-page-full.png'),
      fullPage: true
    });
    console.log('✅ Captured full Datadog page screenshot');
    
    // Look for terminal elements specifically
    const terminalElements = await page.$$('.bg-gray-900, .font-mono, [class*="terminal"]');
    console.log(`🔍 Found ${terminalElements.length} terminal elements on Datadog page`);
    
    for (let i = 0; i < terminalElements.length; i++) {
      const element = terminalElements[i];
      
      try {
        // Get element info
        const elementInfo = await element.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            tagName: el.tagName,
            className: el.className,
            textContent: el.textContent.substring(0, 100) + '...',
            width: computed.width,
            height: computed.height,
            maxWidth: computed.maxWidth,
            fontSize: computed.fontSize
          };
        });
        
        console.log(`📋 Terminal element ${i + 1}:`, elementInfo);
        
        // Scroll to element
        await element.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        
        // Capture element screenshot
        await element.screenshot({
          path: path.join(screenshotsDir, `terminal-${i + 1}.png`)
        });
        console.log(`✅ Captured terminal ${i + 1}`);
        
      } catch (error) {
        console.log(`⚠️  Could not capture terminal ${i + 1}:`, error.message);
      }
    }
    
    // Look for sections that might contain terminals
    const sections = await page.$$('.bg-gray-50, .bg-blue-50');
    console.log(`🔍 Found ${sections.length} potential terminal sections`);
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      try {
        const sectionInfo = await section.evaluate((el) => {
          return {
            className: el.className,
            textContent: el.textContent.substring(0, 200) + '...',
            rect: el.getBoundingClientRect()
          };
        });
        
        console.log(`📋 Section ${i + 1}:`, sectionInfo);
        
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
            path: path.join(screenshotsDir, `section-${i + 1}-terminal.png`)
          });
          console.log(`✅ Captured terminal in section ${i + 1}`);
        }
        
      } catch (error) {
        console.log(`⚠️  Could not capture section ${i + 1}:`, error.message);
      }
    }
    
    // Look for any elements with terminal-like text
    const terminalTexts = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const terminalElements = [];
      
      for (const el of elements) {
        const text = el.textContent || '';
        if (text.includes('$ ') || text.includes('az ') || text.includes('datadog-ci ') || 
            text.includes('export ') || text.includes('DD_') || text.includes('access token')) {
          terminalElements.push({
            tagName: el.tagName,
            className: el.className,
            textContent: text.substring(0, 200) + '...',
            rect: el.getBoundingClientRect()
          });
        }
      }
      
      return terminalElements;
    });
    
    console.log(`🔍 Found ${terminalTexts.length} elements with terminal-like text`);
    
    for (let i = 0; i < terminalTexts.length; i++) {
      const textInfo = terminalTexts[i];
      console.log(`📋 Terminal text ${i + 1}:`, textInfo);
    }
    
    console.log('\n✅ Datadog page screenshots captured successfully!');
    console.log(`📁 Screenshots saved in: ${screenshotsDir}`);
    
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the screenshot capture
captureDatadogPageScreenshots().catch(console.error);