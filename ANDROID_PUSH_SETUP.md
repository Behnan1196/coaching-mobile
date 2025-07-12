# Android Push Notifications Setup

This guide will help you set up Firebase Cloud Messaging (FCM) for Android push notifications.

## Prerequisites

1. Google account
2. Android development environment
3. Expo CLI installed

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "coaching-mobile")
4. Enable Google Analytics (optional)
5. Create the project

## Step 2: Add Android App to Firebase

1. In your Firebase project dashboard, click "Add app" and select Android
2. Enter the package name: `com.behnan.coachingmobile`
3. Enter app nickname: "Coaching Mobile"
4. Skip the SHA-1 certificate for now (optional for push notifications)
5. Click "Register app"

## Step 3: Download Configuration File

1. Download the `google-services.json` file
2. Place it in the root directory of this project (`coaching-mobile/`)
3. Replace the template file `google-services.json.template`

## Step 4: Enable Firebase Cloud Messaging

1. In Firebase Console, go to "Cloud Messaging" in the left sidebar
2. No additional configuration needed - FCM is enabled by default

## Step 5: Test Push Notifications

1. Build and run the app on an Android device (not emulator)
2. Register for push notifications in the app
3. Check the console logs for push token
4. Use the "Test Notification" feature in the app to verify functionality

## Troubleshooting

### Common Issues

1. **"FirebaseApp not configured" error**
   - Ensure `google-services.json` is in the root directory
   - Check that the package name matches exactly: `com.behnan.coachingmobile`

2. **Push token not generated**
   - Make sure you're testing on a physical device
   - Check that notification permissions are granted
   - Verify internet connection

3. **Notifications not received**
   - Check that the app is not in battery optimization mode
   - Ensure the device has Google Play Services installed
   - Check Firebase Console for delivery reports

### Testing Push Notifications

You can test push notifications using the Firebase Console:

1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter title and message text
4. Select "Send test message"
5. Enter the FCM registration token from app logs
6. Send the test message

## File Structure

```
coaching-mobile/
├── google-services.json          # Firebase configuration (do not commit)
├── google-services.json.template # Template file (safe to commit)
├── app.json                     # Updated with Firebase config
└── src/lib/notifications.ts     # Push notification service
```

## Security Notes

- Never commit the actual `google-services.json` file to version control
- The template file is safe to commit as it contains placeholder values
- Add `google-services.json` to your `.gitignore` file

## Next Steps

After completing this setup:

1. Android push notifications should work
2. Test cross-platform notifications between web and mobile
3. Set up production FCM server key for the web app API 