const { execSync } = require('child_process');

// Function to take Percy snapshots
function takePercySnapshots() {
  try {
    console.log('🚀 Starting Percy visual testing...');
    
    // Take snapshots using the snapshots.yml file
    console.log('📸 Taking snapshots from snapshots.yml...');
    execSync('npx percy snapshot snapshots.yml', { 
      stdio: 'inherit' 
    });
    
    console.log('✅ Percy snapshots completed successfully!');
  } catch (error) {
    console.error('❌ Error taking Percy snapshots:', error.message);
    process.exit(1);
  }
}

// Run the snapshots
takePercySnapshots();