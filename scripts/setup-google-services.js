const fs = require('fs');
const path = require('path');

// This script creates google-services.json from environment variable during EAS builds
// It runs before the build process starts (prebuild script)

const setupGoogleServices = () => {
  const googleServicesJson = process.env.GOOGLE_SERVICES_JSON;
  
  if (!googleServicesJson) {
    console.log('⚠️  GOOGLE_SERVICES_JSON environment variable not found.');
    console.log('   This is normal for local development (file should exist locally).');
    console.log('   For EAS builds, make sure the environment variable is set.');
    return;
  }

  const googleServicesPath = path.join(__dirname, '..', 'google-services.json');
  
  try {
    // Parse the JSON to validate it
    const parsedJson = JSON.parse(googleServicesJson);
    
    // Write the formatted JSON to the file
    fs.writeFileSync(googleServicesPath, JSON.stringify(parsedJson, null, 2));
    
    console.log('✅ google-services.json created successfully from environment variable');
    console.log('   Project ID:', parsedJson.project_info?.project_id);
    console.log('   Package name:', parsedJson.client?.[0]?.client_info?.android_client_info?.package_name);
    
  } catch (error) {
    console.error('❌ Error creating google-services.json:', error.message);
    process.exit(1);
  }
};

setupGoogleServices(); 