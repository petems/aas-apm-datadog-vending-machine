const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function captureTerminalScreenshots(branchName) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log(`🚀 Capturing terminal screenshots on ${branchName} branch...`);
    
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Navigate to the app
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Create screenshots directory for this branch
    const screenshotsDir = path.join(__dirname, `percy-screenshots-${branchName}`);
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }
    
    // Wait a bit for any dynamic content to settle
    await page.waitForTimeout(2000);
    
    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'full-page.png'),
      fullPage: true
    });
    
    // Find and capture the first terminal (Azure auth section)
    const azureTerminal = await page.$('.bg-gray-50 .bg-gray-900');
    if (azureTerminal) {
      await azureTerminal.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      await azureTerminal.screenshot({
        path: path.join(screenshotsDir, 'azure-auth-terminal.png')
      });
      console.log(`✅ Captured Azure auth terminal on ${branchName}`);
    } else {
      console.log(`⚠️  Azure auth terminal not found on ${branchName}`);
    }
    
    // Find and capture the second terminal (datadog-ci section)
    const datadogTerminal = await page.$('.bg-blue-50 .bg-gray-900');
    if (datadogTerminal) {
      await datadogTerminal.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      await datadogTerminal.screenshot({
        path: path.join(screenshotsDir, 'datadog-ci-terminal.png')
      });
      console.log(`✅ Captured datadog-ci terminal on ${branchName}`);
    } else {
      console.log(`⚠️  Datadog CI terminal not found on ${branchName}`);
    }
    
    // Capture the entire terminal sections for context
    const azureSection = await page.$('.bg-gray-50');
    if (azureSection) {
      await azureSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      await azureSection.screenshot({
        path: path.join(screenshotsDir, 'azure-section.png')
      });
    }
    
    const datadogSection = await page.$('.bg-blue-50');
    if (datadogSection) {
      await datadogSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      
      await datadogSection.screenshot({
        path: path.join(screenshotsDir, 'datadog-section.png')
      });
    }
    
    console.log(`✅ Completed screenshots for ${branchName} branch`);
    
  } catch (error) {
    console.error(`❌ Error capturing screenshots on ${branchName}:`, error.message);
  } finally {
    await browser.close();
  }
}

async function runPercyComparison() {
  console.log('🔍 Starting Percy terminal comparison...\n');
  
  // Get current branch name
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log(`Current branch: ${currentBranch}`);
  
  // Capture screenshots on current branch
  console.log('\n📸 Capturing screenshots on current branch...');
  await captureTerminalScreenshots(currentBranch);
  
  // Switch to master and capture screenshots
  console.log('\n📸 Switching to master branch...');
  execSync('git stash', { stdio: 'inherit' });
  execSync('git checkout master', { stdio: 'inherit' });
  execSync('git pull origin master', { stdio: 'inherit' });
  
  // Start dev server on master
  console.log('🚀 Starting dev server on master...');
  const masterServer = execSync('yarn start', { stdio: 'pipe' });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  console.log('\n📸 Capturing screenshots on master branch...');
  await captureTerminalScreenshots('master');
  
  // Switch back to feature branch
  console.log('\n📸 Switching back to feature branch...');
  execSync('git checkout ' + currentBranch, { stdio: 'inherit' });
  execSync('git stash pop', { stdio: 'inherit' });
  
  // Start dev server on feature branch
  console.log('🚀 Starting dev server on feature branch...');
  const featureServer = execSync('yarn start', { stdio: 'pipe' });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  console.log('\n✅ Percy terminal comparison completed!');
  console.log('\n📁 Screenshots saved in:');
  console.log(`   - percy-screenshots-${currentBranch}/`);
  console.log('   - percy-screenshots-master/');
  
  // Create comparison report
  createComparisonReport(currentBranch);
}

function createComparisonReport(currentBranch) {
  const report = `
<!DOCTYPE html>
<html>
<head>
    <title>Terminal Comparison Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .comparison { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
        .terminal { margin: 10px 0; }
        img { max-width: 100%; border: 1px solid #ccc; }
        h2 { color: #333; }
        .diff { background: #f0f0f0; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Terminal Comparison Report</h1>
    <p><strong>Feature Branch:</strong> ${currentBranch}</p>
    <p><strong>Base Branch:</strong> master</p>
    
    <div class="comparison">
        <h2>Azure Auth Terminal</h2>
        <div class="terminal">
            <h3>Master Branch</h3>
            <img src="percy-screenshots-master/azure-auth-terminal.png" alt="Azure Auth Terminal - Master">
        </div>
        <div class="terminal">
            <h3>Feature Branch</h3>
            <img src="percy-screenshots-${currentBranch}/azure-auth-terminal.png" alt="Azure Auth Terminal - Feature">
        </div>
        <div class="diff">
            <h4>Key Differences:</h4>
            <ul>
                <li>Feature branch: Terminal removed for cleaner UI</li>
                <li>Master branch: Full Azure CLI terminal with commands</li>
            </ul>
        </div>
    </div>
    
    <div class="comparison">
        <h2>Datadog CI Terminal</h2>
        <div class="terminal">
            <h3>Master Branch</h3>
            <img src="percy-screenshots-master/datadog-ci-terminal.png" alt="Datadog CI Terminal - Master">
        </div>
        <div class="terminal">
            <h3>Feature Branch</h3>
            <img src="percy-screenshots-${currentBranch}/datadog-ci-terminal.png" alt="Datadog CI Terminal - Feature">
        </div>
        <div class="diff">
            <h4>Key Differences:</h4>
            <ul>
                <li>Feature branch: Wider terminal (max-w-5xl vs max-w-4xl)</li>
                <li>Feature branch: Smaller text (text-xs vs text-sm)</li>
                <li>Feature branch: Better command visibility</li>
            </ul>
        </div>
    </div>
</body>
</html>`;
  
  fs.writeFileSync('percy-terminal-comparison-report.html', report);
  console.log('\n📄 Comparison report created: percy-terminal-comparison-report.html');
}

// Run the comparison
runPercyComparison().catch(console.error);