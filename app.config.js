module.exports = {
  expo: {
    name: "Özgün Koçluk",
    slug: "ozgun-kocluk",
    version: "1.0.8",
    orientation: "portrait",
    userInterfaceStyle: "light",
    icon: "./assets/icon.png",
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.behnan.coachingmobile",
      buildNumber: "2",
      icon: "./assets/icon.png",
      infoPlist: {
        NSCameraUsageDescription: "This app needs access to camera for video calls with your coach",
        NSMicrophoneUsageDescription: "This app needs access to microphone for voice calls with your coach",
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription: "This app needs access to photo library for profile avatar uploads",
        NSPhotoLibraryAddUsageDescription: "This app needs access to photo library for profile avatar uploads"
      },
      entitlements: {
        "aps-environment": "production",
        "com.apple.developer.associated-domains": ["applinks:ozgun-v20.vercel.app"]
      }
    },
    android: {
      versionCode: 11,
      minSdkVersion: 21,
      targetSdkVersion: 35,
      compileSdkVersion: 35,
      supports16KbPageSize: true,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.CHANGE_NETWORK_STATE",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.WAKE_LOCK",
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.VIBRATE",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.INTERNET"
      ],
      package: "com.behnan.coachingmobile.v2",
      googleServicesFile: "./google-services.json"
    },
    plugins: [
      "expo-av",
      "expo-secure-store",
      "expo-notifications",
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: false,
            // NDK version for 16KB page size support
            ndkVersion: "27.1.12297006",
            // Enable new architecture for better 16KB support
            newArchEnabled: false,
            // Custom properties for 16KB page size
            extraPropertiesGradle: {
              "android.bundle.enableUncompressedNativeLibs": "false"
            },
            // Packagingptions for native libs
            packagingOptions: {
              jniLibs: {
                useLegacyPackaging: false
              }
            }
          }
        }
      ]
    ],
    sdkVersion: "53.0.0",
    owner: "menkaorg",
    extra: {
      eas: {
        projectId: "f3bd63eb-ee7c-473c-b495-028dd828c34c"
      }
    }
  }
};
