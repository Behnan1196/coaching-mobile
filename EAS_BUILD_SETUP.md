# EAS Build Setup Guide

## Overview
This guide explains how the coaching mobile app is configured for EAS (Expo Application Services) builds, specifically addressing the `google-services.json` configuration for Android builds.

## The Problem
EAS Build only uploads files tracked by Git. Since `google-services.json` contains sensitive Firebase configuration and should not be committed to version control, Android builds were failing with the error:
```
"google-services.json" is missing, make sure that the file exists.
```

## The Solution
We've implemented a secure solution using EAS environment variables and npm postinstall script:

### 1. Environment Variables Configuration
The `google-services.json` content is stored as an environment variable `GOOGLE_SERVICES_JSON` in `eas.json` for both preview and production builds.

### 2. NPM PostInstall Script
A Node.js script (`scripts/setup-google-services.js`) runs automatically after npm install via the `postinstall` script in `package.json` to:
- Read the `GOOGLE_SERVICES_JSON` environment variable
- Parse and validate the JSON content
- Create the `google-services.json` file in the project root
- Provide feedback about the process

### 3. EAS Configuration
The `eas.json` includes:
- `env.GOOGLE_SERVICES_JSON`: Contains the Firebase configuration
- The `postinstall` script in `package.json` runs automatically after dependencies are installed

## How It Works

### During EAS Builds:
1. EAS installs dependencies using npm/yarn
2. The npm `postinstall` script runs `node scripts/setup-google-services.js`
3. The script creates `google-services.json` from the environment variable
4. The build process continues with the file available
5. Push notifications work correctly in the built app

### During Local Development:
1. The `google-services.json` file exists locally (not tracked by Git)
2. The postinstall script runs but skips creation if the file already exists
3. Local development uses the existing file
4. No interference with your development workflow

## Security Benefits
- ✅ Sensitive Firebase configuration is not committed to Git
- ✅ Environment variables are securely managed by EAS
- ✅ The actual `google-services.json` is excluded from version control
- ✅ Both local development and EAS builds work seamlessly

## Build Commands
```bash
# Preview build (APK)
eas build --platform android --profile preview

# Production build (AAB)
eas build --platform android --profile production
```

## File Structure
```
coaching-mobile/
├── eas.json                          # EAS configuration with env vars
├── package.json                      # Contains postinstall script
├── scripts/
│   └── setup-google-services.js      # Script run by postinstall
├── google-services.json              # Local file (not tracked)
├── google-services.json.template     # Template for reference
└── .gitignore                        # Excludes google-services.json
```

## Environment Variables
The `GOOGLE_SERVICES_JSON` environment variable contains the complete Firebase configuration:
- Project info (project_id, project_number, storage_bucket)
- Client info (mobilesdk_app_id, package_name)
- API keys for Firebase services
- Service configurations

## Troubleshooting

### Build Still Failing?
1. Check that the `GOOGLE_SERVICES_JSON` environment variable is properly set in `eas.json`
2. Verify the JSON is valid and escaped properly
3. Ensure the postinstall script is configured correctly in `package.json`
4. Check the EAS build logs for script execution details

### Local Development Issues?
1. Make sure `google-services.json` exists in your project root
2. The file should match the template structure in `google-services.json.template`
3. The postinstall script runs locally but won't overwrite existing files

### Script Errors?
The setup script includes comprehensive error handling:
- Validates JSON syntax
- Provides clear success/failure messages
- Logs key configuration details
- Exits with proper error codes

## Updating Firebase Configuration
If you need to update Firebase settings:
1. Update the `GOOGLE_SERVICES_JSON` value in `eas.json`
2. Update your local `google-services.json` file
3. Commit the changes
4. The next EAS build will use the updated configuration

## NPM PostInstall vs EAS Hooks
We use npm's `postinstall` script instead of EAS hooks because:
- `postinstall` is a standard npm feature that works reliably with EAS
- It runs automatically after dependencies are installed
- No special EAS configuration required
- Widely supported and well-documented approach
- Works consistently across different EAS versions

## Security Note
Never commit the actual `google-services.json` file to version control. Always use the environment variable approach for EAS builds and maintain the local file for development. 