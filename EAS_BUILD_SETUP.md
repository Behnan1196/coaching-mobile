# EAS Build Setup Guide

## Overview
This guide explains how the coaching mobile app is configured for EAS (Expo Application Services) builds, specifically addressing the `google-services.json` configuration for Android builds.

## The Problem
EAS Build only uploads files tracked by Git. Since `google-services.json` contains sensitive Firebase configuration and should not be committed to version control, Android builds were failing with the error:
```
"google-services.json" is missing, make sure that the file exists.
```

## The Solution
We've implemented a secure solution using EAS environment variables and a prebuild script:

### 1. Environment Variables Configuration
The `google-services.json` content is stored as an environment variable `GOOGLE_SERVICES_JSON` in `eas.json` for both preview and production builds.

### 2. Prebuild Script
A Node.js script (`scripts/setup-google-services.js`) runs before each build to:
- Read the `GOOGLE_SERVICES_JSON` environment variable
- Parse and validate the JSON content
- Create the `google-services.json` file in the project root
- Provide feedback about the process

### 3. EAS Configuration
The `eas.json` includes:
- `prebuildCommand`: Runs the setup script before building
- `env.GOOGLE_SERVICES_JSON`: Contains the Firebase configuration

## How It Works

### During EAS Builds:
1. EAS reads the environment variables from `eas.json`
2. The `prebuildCommand` runs `node scripts/setup-google-services.js`
3. The script creates `google-services.json` from the environment variable
4. The build process continues with the file available
5. Push notifications work correctly in the built app

### During Local Development:
1. The `google-services.json` file exists locally (not tracked by Git)
2. The prebuild script detects no environment variable and skips creation
3. Local development uses the existing file
4. No changes needed to your development workflow

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
├── scripts/
│   └── setup-google-services.js      # Prebuild script
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
3. Ensure the prebuild script is executable
4. Check the EAS build logs for script execution details

### Local Development Issues?
1. Make sure `google-services.json` exists in your project root
2. The file should match the template structure in `google-services.json.template`
3. The prebuild script will skip creation if the env var is not found

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
3. Commit the `eas.json` changes
4. The next EAS build will use the updated configuration

## Security Note
Never commit the actual `google-services.json` file to version control. Always use the environment variable approach for EAS builds and maintain the local file for development. 