const fs = require('fs');
const path = require('path');

// This script creates google-services.json from environment variable during EAS builds
// It runs as a postinstall script after npm install

const setupGoogleServices = () => {
  const googleServicesPath = path.join(__dirname, '..', 'google-services.json');
  const googleServicesJson = process.env.GOOGLE_SERVICES_JSON;
  
  // Check if file already exists (local development)
  const fileExists = fs.existsSync(googleServicesPath);
  
  // Check if we're in an EAS build environment
  const isEASBuild = process.env.EAS_BUILD_PLATFORM || process.env.EAS_BUILD;
  
  if (fileExists && !isEASBuild) {
    console.log('✅ google-services.json already exists locally - skipping creation');
    return;
  }
  
  if (!googleServicesJson) {
    if (isEASBuild) {
      console.log('⚠️ GOOGLE_SERVICES_JSON not found - creating minimal config for development build');
      // Create a minimal google-services.json for development builds
      const minimalConfig = {
        "project_info": {
          "project_number": "123456789",
          "project_id": "coaching-mobile-dev"
        },
        "client": [{
          "client_info": {
            "mobilesdk_app_id": "1:123456789:android:dev",
            "android_client_info": {
              "package_name": "com.coaching.mobile"
            }
          },
          "api_key": [{
            "current_key": "dev-key"
          }]
        }]
      };
      fs.writeFileSync(googleServicesPath, JSON.stringify(minimalConfig, null, 2));
      console.log('✅ Minimal google-services.json created for development');
      return;
    } else {
      console.log('⚠️  GOOGLE_SERVICES_JSON environment variable not found.');
      console.log('   For local development, make sure google-services.json exists.');
      console.log('   For EAS builds, the environment variable must be set.');
      return;
    }
  }

  try {
    // Parse the JSON to validate it
    const parsedJson = JSON.parse(googleServicesJson);
    
    // Write the formatted JSON to the file
    fs.writeFileSync(googleServicesPath, JSON.stringify(parsedJson, null, 2));
    
    console.log('✅ google-services.json created successfully from environment variable');
    console.log('   Project ID:', parsedJson.project_info?.project_id);
    console.log('   Package name:', parsedJson.client?.[0]?.client_info?.android_client_info?.package_name);
    console.log('   Build environment:', isEASBuild ? 'EAS Build' : 'Local');
    
  } catch (error) {
    console.error('❌ Error creating google-services.json:', error.message);
    process.exit(1);
  }
};

setupGoogleServices(); 