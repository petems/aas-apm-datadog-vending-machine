const { chromium } = require('playwright');

async function runPercyTest() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport to capture the terminal components properly
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  // Navigate to the app
  await page.goto('http://localhost:3000');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Take a snapshot of the main page
  await page.evaluate(() => {
    // Trigger Percy snapshot
    if (window.PercyAgent) {
      window.PercyAgent.snapshot('Main Page - Terminal Components');
    }
  });
  
  // Scroll to the Datadog CI CLI section to capture the terminal
  await page.evaluate(() => {
    const terminalSection = document.querySelector('.bg-blue-50');
    if (terminalSection) {
      terminalSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
  
  // Wait for scroll to complete
  await page.waitForTimeout(1000);
  
  // Take a snapshot of the terminal section
  await page.evaluate(() => {
    if (window.PercyAgent) {
      window.PercyAgent.snapshot('Datadog CI CLI Terminal');
    }
  });
  
  await browser.close();
}

runPercyTest().catch(console.error);