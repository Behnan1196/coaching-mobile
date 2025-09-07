import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Enhanced notification handler for Android background notifications
 * This ensures notifications are properly displayed when app is closed/background
 */
export function setupFirebaseMessaging() {
  if (Platform.OS === 'android') {
    console.log('🔔 Setting up enhanced Android notification handler');
    
    // Set up notification handler with enhanced background support
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        const notificationType = data?.type;
        
        console.log('🔔 Enhanced notification handler triggered:', {
          type: notificationType,
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: data,
        });
        
        // For video invites, force maximum visibility
        if (notificationType === 'video_invite') {
          console.log('📹 Forcing video invite notification with maximum visibility');
          
          // If this is a data-only notification (no title/body), create a proper one
          if (!notification.request.content.title && data?.notificationTitle) {
            console.log('📹 Creating local notification from data-only FCM message');
            
            // Schedule a local notification to ensure it shows properly
            await Notifications.scheduleNotificationAsync({
              content: {
                title: data.notificationTitle || 'Video Görüşme Daveti',
                body: data.notificationBody || 'Size video görüşme daveti gönderildi',
                data: data,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.MAX,
                vibrate: [0, 250, 250, 250],
                categoryIdentifier: 'video_invite',
              },
              trigger: null, // Show immediately
            });
            
            // Don't show the original empty notification
            return {
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
              shouldShowBanner: false,
              shouldShowList: false,
            };
          }
          
          // For normal notifications, show with full settings
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

    console.log('✅ Enhanced Firebase messaging setup complete for Android');
  }
}
