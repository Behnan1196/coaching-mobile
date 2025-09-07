import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Handle background FCM messages on Android
 * This ensures notifications are properly displayed when app is closed/background
 */
export function setupFirebaseMessaging() {
  if (Platform.OS === 'android') {
    // Set up background message handler
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        const notificationType = data?.type;
        
        console.log('🔔 Background notification received:', {
          type: notificationType,
          title: notification.request.content.title,
          body: notification.request.content.body,
        });
        
        // For video invites, always show with sound and vibration
        if (notificationType === 'video_invite') {
          console.log('📹 Showing video invite notification in background');
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        }
        
        // Default behavior for other notifications
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });

    console.log('✅ Firebase messaging setup complete for Android');
  }
}
