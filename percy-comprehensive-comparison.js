const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureComprehensiveScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🚀 Capturing comprehensive terminal screenshots...');
    
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Get current branch name
    const branchName = process.env.GIT_BRANCH || 'unknown';
    const screenshotsDir = path.join(__dirname, `percy-comprehensive-${branchName.replace(/\//g, '-')}`);
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }
    
    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'full-page.png'),
      fullPage: true
    });
    console.log('✅ Captured full page screenshot');
    
    // Find all elements with terminal-like classes
    const terminalElements = await page.$$('.bg-gray-900, .font-mono, [class*="terminal"], [class*="code"]');
    console.log(`🔍 Found ${terminalElements.length} terminal-like elements`);
    
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
            fontSize: computed.fontSize,
            backgroundColor: computed.backgroundColor
          };
        });
        
        console.log(`📋 Element ${i + 1}:`, elementInfo);
        
        // Scroll to element
        await element.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        
        // Capture element screenshot
        await element.screenshot({
          path: path.join(screenshotsDir, `terminal-element-${i + 1}.png`)
        });
        console.log(`✅ Captured terminal element ${i + 1}`);
        
      } catch (error) {
        console.log(`⚠️  Could not capture element ${i + 1}:`, error.message);
      }
    }
    
    // Find all sections that might contain terminals
    const sections = await page.$$('div[class*="bg-"]');
    console.log(`🔍 Found ${sections.length} sections with background colors`);
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      try {
        const sectionInfo = await section.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            className: el.className,
            textContent: el.textContent.substring(0, 200) + '...',
            width: computed.width,
            height: computed.height
          };
        });
        
        // Only capture sections that might be relevant
        if (sectionInfo.textContent.includes('Azure') || 
            sectionInfo.textContent.includes('datadog') || 
            sectionInfo.textContent.includes('CLI') ||
            sectionInfo.textContent.includes('terminal') ||
            sectionInfo.textContent.includes('command')) {
          
          console.log(`📋 Relevant section ${i + 1}:`, sectionInfo);
          
          await section.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          
          await section.screenshot({
            path: path.join(screenshotsDir, `relevant-section-${i + 1}.png`)
          });
          console.log(`✅ Captured relevant section ${i + 1}`);
        }
        
      } catch (error) {
        console.log(`⚠️  Could not capture section ${i + 1}:`, error.message);
      }
    }
    
    // Look for specific text patterns that indicate terminals
    const terminalTexts = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const terminalElements = [];
      
      for (const el of elements) {
        const text = el.textContent || '';
        if (text.includes('$ ') || text.includes('az ') || text.includes('datadog-ci ') || 
            text.includes('export ') || text.includes('DD_')) {
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
    
    console.log('\n✅ Comprehensive screenshots captured successfully!');
    console.log(`📁 Screenshots saved in: ${screenshotsDir}`);
    
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the screenshot capture
captureComprehensiveScreenshots().catch(console.error);