const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Percy configuration for visual testing
const percyConfig = {
  version: 2,
  discovery: {
    allowedHostnames: ['localhost'],
    disallowedHostnames: [],
    networkIdleTimeout: 100,
    concurrency: 1,
  },
  snapshot: {
    widths: [1280, 1920],
    minHeight: 1024,
    percyCSS: `
      /* Hide any dynamic content that might cause flakiness */
      .debug-info { display: none !important; }
      .loading-spinner { display: none !important; }
    `,
  },
  static: {
    baseUrl: '/',
    include: ['public/**/*'],
  },
};

// Snapshots configuration for terminal components
const snapshots = [
  {
    name: "Main Page - Terminal Components",
    url: "http://localhost:3000",
    waitForTimeout: 2000,
    waitForSelector: ".bg-gray-50"
  },
  {
    name: "Datadog CI CLI Terminal",
    url: "http://localhost:3000",
    waitForTimeout: 3000,
    waitForSelector: ".bg-blue-50",
    executeScript: `
      document.querySelector('.bg-blue-50').scrollIntoView({ behavior: 'smooth' });
      return new Promise(resolve => setTimeout(resolve, 1000));
    `
  },
  {
    name: "Azure Access Token Section",
    url: "http://localhost:3000",
    waitForTimeout: 2000,
    waitForSelector: ".bg-gray-50"
  }
];

function setupPercy() {
  console.log('🔧 Setting up Percy for terminal component visual testing...\n');
  
  // Create Percy config file
  fs.writeFileSync('.percy.js', `module.exports = ${JSON.stringify(percyConfig, null, 2)};`);
  console.log('✅ Created .percy.js configuration file');
  
  // Create snapshots file
  fs.writeFileSync('snapshots.yml', snapshots.map(snapshot => 
    `- name: "${snapshot.name}"\n  url: "${snapshot.url}"\n  waitForTimeout: ${snapshot.waitForTimeout}\n  waitForSelector: "${snapshot.waitForSelector}"${snapshot.executeScript ? `\n  executeScript: |\n    ${snapshot.executeScript}` : ''}`
  ).join('\n\n'));
  console.log('✅ Created snapshots.yml file');
  
  // Update package.json scripts
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (!packageJson.scripts['percy:test']) {
    packageJson.scripts['percy:test'] = 'percy exec -- yarn start';
    packageJson.scripts['percy:snapshot'] = 'percy snapshot';
    packageJson.scripts['percy:build'] = 'yarn build && percy snapshot build';
    packageJson.scripts['visual:test'] = 'node visual-test.js';
    packageJson.scripts['visual:compare'] = 'node compare-screenshots.js';
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated package.json with Percy scripts');
  }
  
  console.log('\n📋 Available Percy commands:');
  console.log('  yarn percy:test     - Run Percy tests with live server');
  console.log('  yarn percy:snapshot - Take snapshots of static build');
  console.log('  yarn visual:test    - Capture screenshots for comparison');
  console.log('  yarn visual:compare - Compare screenshots between branches');
  
  console.log('\n🚀 To use Percy with your CI/CD:');
  console.log('  1. Set PERCY_TOKEN environment variable');
  console.log('  2. Run: yarn percy:test');
  console.log('  3. Percy will automatically compare with baseline');
  
  console.log('\n📸 For manual comparison (current setup):');
  console.log('  1. Run: yarn visual:test');
  console.log('  2. Switch to master branch and run again');
  console.log('  3. Run: yarn visual:compare');
  console.log('  4. Open comparison-report.html in browser');
}

// Run setup
setupPercy();