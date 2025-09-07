import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Debounce mechanism to prevent duplicate notifications
let lastNotificationTime = 0;
const NOTIFICATION_DEBOUNCE_MS = 2000; // 2 seconds

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
          
          // For data-only notifications, create a proper local notification (with debounce)
          if (data?.showNotification === 'true' && data?.notificationTitle) {
            const now = Date.now();
            const inviteId = data?.inviteId || 'unknown';
            
            // Debounce to prevent duplicate notifications
            if (now - lastNotificationTime < NOTIFICATION_DEBOUNCE_MS) {
              console.log('⏰ Debouncing duplicate notification');
              return {
                shouldShowAlert: false,
                shouldPlaySound: false,
                shouldSetBadge: false,
                shouldShowBanner: false,
                shouldShowList: false,
              };
            }
            
            lastNotificationTime = now;
            
            console.log('📹 Creating enhanced local notification from FCM data');
            console.log('📹 Notification data:', {
              inviteId,
              title: data.notificationTitle,
              body: data.notificationBody,
              originalTitle: notification.request.content.title,
              originalBody: notification.request.content.body
            });
            
            // Schedule a local notification to ensure it shows properly
            await Notifications.scheduleNotificationAsync({
              content: {
                title: data.notificationTitle || data.title || 'Video Görüşme Daveti',
                body: data.notificationBody || data.body || 'Size video görüşme daveti gönderildi',
                data: data,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.MAX,
                vibrate: [0, 500, 250, 500],
                categoryIdentifier: 'video_invite',
              },
              trigger: null, // Show immediately
              identifier: `video_invite_${inviteId}`, // Use invite ID for uniqueness
            });
            
            console.log('✅ Enhanced local notification scheduled');
            
            // Don't show the original FCM notification
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
