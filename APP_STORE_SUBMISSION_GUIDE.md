# Apple App Store Submission Guide

## 🍎 Preparing Your App for App Store Submission

### Current App Configuration
- **App Name**: Özgün Koçluk
- **Version**: 1.0.2
- **Build Number**: 2
- **Bundle ID**: com.behnan.coachingmobile
- **Platform**: iOS (with Android support)

## 📋 Prerequisites

### 1. Apple Developer Account
- [ ] Active Apple Developer Program membership ($99/year)
- [ ] Access to App Store Connect
- [ ] Valid Apple Team ID

### 2. App Store Connect Setup
- [ ] App created in App Store Connect
- [ ] App Store Connect App ID (ascAppId)
- [ ] App metadata prepared (description, screenshots, etc.)

### 3. Development Environment
- [ ] EAS CLI installed and configured
- [ ] Expo account linked
- [ ] Apple certificates and provisioning profiles

## 🔧 Configuration Updates Needed

### 1. Update EAS Configuration
You need to update the `eas.json` file with your actual Apple credentials:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-actual-apple-id@email.com",
      "ascAppId": "your-actual-app-store-connect-app-id",
      "appleTeamId": "your-actual-apple-team-id"
    }
  }
}
```

**To find these values:**
- **appleId**: Your Apple ID email
- **ascAppId**: App Store Connect → My Apps → Your App → App Information → Apple ID
- **appleTeamId**: Apple Developer → Membership → Team ID

### 2. App Store Connect App Setup
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app if not exists
3. Fill in app information:
   - **Name**: Özgün Koçluk
   - **Bundle ID**: com.behnan.coachingmobile
   - **SKU**: coaching-mobile-ios
   - **User Access**: Full Access

## 🚀 Build and Submit Process

### Step 1: Build Production iOS App
```bash
# Build for iOS production
eas build --platform ios --profile production
```

### Step 2: Submit to App Store
```bash
# Submit the build to App Store Connect
eas submit --platform ios --profile production
```

### Step 3: App Store Review Process
1. **App Review**: Apple reviews your app (1-7 days)
2. **Metadata Review**: Screenshots, descriptions, etc.
3. **Technical Review**: App functionality and compliance
4. **Approval/Rejection**: You'll receive notification

## 📱 App Store Requirements

### 1. App Store Guidelines Compliance
- [ ] No crashes or bugs
- [ ] Proper privacy policy
- [ ] Appropriate content rating
- [ ] No misleading information

### 2. Required Metadata
- [ ] App description (4000 characters max)
- [ ] Keywords (100 characters max)
- [ ] Screenshots (6.7" iPhone, 12.9" iPad)
- [ ] App icon (1024x1024 PNG)
- [ ] Privacy policy URL
- [ ] Support URL

### 3. App Store Categories
- **Primary**: Education
- **Secondary**: Productivity

## 🔐 Privacy and Security

### 1. Privacy Policy
- [ ] Create privacy policy document
- [ ] Host on your website
- [ ] Include in App Store Connect

### 2. Data Collection
- [ ] Camera access for video calls
- [ ] Microphone access for voice calls
- [ ] Photo library for avatar uploads
- [ ] Push notifications

### 3. App Tracking Transparency
- [ ] Implement ATT framework
- [ ] Request permission appropriately
- [ ] Handle user choices

## 📸 Screenshots and Assets

### Required Screenshots
- **iPhone 6.7"**: 1290 x 2796 pixels
- **iPad 12.9"**: 2048 x 2732 pixels
- **Minimum**: 3 screenshots
- **Maximum**: 10 screenshots

### App Icon
- **Size**: 1024 x 1024 pixels
- **Format**: PNG
- **No transparency**: Must have solid background
- **No rounded corners**: Apple adds them automatically

## 🚨 Common Rejection Reasons

### 1. Technical Issues
- App crashes during review
- Broken functionality
- Poor performance
- Memory leaks

### 2. Content Issues
- Inappropriate content
- Copyright violations
- Misleading information
- Incomplete features

### 3. Policy Violations
- Missing privacy policy
- Improper data collection
- Violation of App Store guidelines

## 📋 Pre-Submission Checklist

### Code Quality
- [ ] All features working properly
- [ ] No console errors
- [ ] Proper error handling
- [ ] Performance optimized

### Testing
- [ ] Tested on multiple devices
- [ ] Tested with different iOS versions
- [ ] Tested all user flows
- [ ] Tested edge cases

### Configuration
- [ ] Production environment variables
- [ ] Correct API endpoints
- [ ] Push notifications working
- [ ] App icons and assets ready

## 🔄 Update Process

### For Future Updates
1. **Increment version** in `app.json`
2. **Increment buildNumber** for iOS
3. **Increment versionCode** for Android
4. **Build new version** with EAS
5. **Submit for review**

## 📞 Support and Resources

### Official Documentation
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

### Getting Help
- [Apple Developer Forums](https://developer.apple.com/forums/)
- [Expo Discord](https://chat.expo.dev/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)

## ⚠️ Important Notes

1. **Review Time**: App Store review typically takes 1-7 days
2. **Rejections**: Common and normal - fix issues and resubmit
3. **Updates**: Minor updates may be reviewed faster
4. **Compliance**: Always follow Apple's guidelines
5. **Testing**: Test thoroughly before submission

## 🎯 Next Steps

1. **Update EAS configuration** with your Apple credentials
2. **Create app in App Store Connect**
3. **Prepare app metadata** (description, screenshots, etc.)
4. **Build production version** with EAS
5. **Submit for review**
6. **Monitor review process**
7. **Publish when approved**

Good luck with your App Store submission! 🚀
