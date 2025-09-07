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
        console.log('🔔 NOTIFICATION HANDLER TRIGGERED - Raw notification:', {
          title: notification.request.content.title,
          body: notification.request.content.body,
          hasData: !!notification.request.content.data,
          dataKeys: notification.request.content.data ? Object.keys(notification.request.content.data) : [],
          fullData: notification.request.content.data
        });
        
        const data = notification.request.content.data;
        const notificationType = data?.type;
        
        console.log('🔔 Enhanced notification handler triggered:', {
          type: notificationType,
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: data,
        });
        
        // For video invites, show with maximum visibility and sound
        if (notificationType === 'video_invite') {
          console.log('📹 Showing video invite notification with maximum visibility');
          
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
          
          console.log('📹 Video invite notification data:', {
            inviteId,
            title: notification.request.content.title,
            body: notification.request.content.body,
            hasTitle: !!notification.request.content.title,
            hasBody: !!notification.request.content.body
          });
          
          // Show the notification with maximum visibility
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

    // Also set up direct notification listeners for FCM data messages
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Direct notification listener triggered:', {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data
      });
      
      const data = notification.request.content.data;
      if (data?.type === 'video_invite' && data?.showNotification === 'true') {
        console.log('📹 Processing video invite via direct listener');
        
        // Create notification if it doesn't have proper title/body
        if (!notification.request.content.title && data?.notificationTitle) {
          console.log('📹 Creating notification from data-only message via direct listener');
          
          Notifications.scheduleNotificationAsync({
            content: {
              title: data.notificationTitle || 'Video Görüşme Daveti',
              body: data.notificationBody || 'Size video görüşme daveti gönderildi',
              data: data,
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.MAX,
              vibrate: [0, 500, 250, 500],
              categoryIdentifier: 'video_invite',
            },
            trigger: null,
            identifier: `video_invite_direct_${data.inviteId || Date.now()}`,
          }).then(() => {
            console.log('✅ Direct listener notification scheduled');
          }).catch(error => {
            console.error('❌ Direct listener notification failed:', error);
          });
        }
      }
    });

    console.log('✅ Enhanced Firebase messaging setup complete for Android');
    console.log('✅ Direct notification listener registered');
  }
}
