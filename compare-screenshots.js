const fs = require('fs');
const path = require('path');

function compareScreenshots() {
  console.log('🔍 Comparing screenshots between feature branch and master...\n');
  
  const featureDir = path.join(__dirname, 'screenshots');
  const masterDir = path.join(__dirname, 'screenshots-master');
  
  // Check if both directories exist
  if (!fs.existsSync(featureDir)) {
    console.error('❌ Feature branch screenshots not found!');
    return;
  }
  
  if (!fs.existsSync(masterDir)) {
    console.error('❌ Master branch screenshots not found!');
    return;
  }
  
  // List files in both directories
  const featureFiles = fs.readdirSync(featureDir).filter(file => file.endsWith('.png'));
  const masterFiles = fs.readdirSync(masterDir).filter(file => file.endsWith('.png'));
  
  console.log('📁 Feature branch screenshots:');
  featureFiles.forEach(file => {
    const stats = fs.statSync(path.join(featureDir, file));
    console.log(`  - ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  });
  
  console.log('\n📁 Master branch screenshots:');
  masterFiles.forEach(file => {
    const stats = fs.statSync(path.join(masterDir, file));
    console.log(`  - ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  });
  
  console.log('\n📊 Comparison Summary:');
  console.log('✅ Screenshots captured successfully for both branches');
  console.log('📸 You can now visually compare the terminal components:');
  console.log('   - Azure Access Token section (terminal removed in feature branch)');
  console.log('   - Datadog CI CLI terminal (wider and smaller text in feature branch)');
  console.log('   - Overall layout and spacing changes');
  
  console.log('\n🔗 To view the differences:');
  console.log('   1. Open both screenshot directories');
  console.log('   2. Compare corresponding files side by side');
  console.log('   3. Look for terminal width, text size, and layout changes');
  
  // Create a simple HTML report for easier comparison
  createComparisonReport(featureFiles, masterFiles);
}

function createComparisonReport(featureFiles, masterFiles) {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Terminal Component Comparison</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .comparison { display: flex; margin: 20px 0; border: 1px solid #ccc; }
        .side { flex: 1; padding: 10px; text-align: center; }
        .side h3 { margin: 0 0 10px 0; }
        img { max-width: 100%; height: auto; border: 1px solid #ddd; }
        .feature { background-color: #e8f5e8; }
        .master { background-color: #f5e8e8; }
    </style>
</head>
<body>
    <h1>Terminal Component Visual Comparison</h1>
    <p>Feature Branch vs Master Branch</p>
    
    <div class="comparison">
        <div class="side feature">
            <h3>Feature Branch (Current)</h3>
            <p>Changes: Removed Azure CLI terminal, wider Datadog terminal, smaller text</p>
            ${featureFiles.map(file => `<img src="screenshots/${file}" alt="${file}"><br><small>${file}</small>`).join('')}
        </div>
        <div class="side master">
            <h3>Master Branch (Original)</h3>
            <p>Original: Both terminals present, standard width and text size</p>
            ${masterFiles.map(file => `<img src="screenshots-master/${file}" alt="${file}"><br><small>${file}</small>`).join('')}
        </div>
    </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(__dirname, 'comparison-report.html'), htmlContent);
  console.log('\n📄 HTML comparison report created: comparison-report.html');
  console.log('   Open this file in your browser for side-by-side comparison');
}

// Run the comparison
compareScreenshots();