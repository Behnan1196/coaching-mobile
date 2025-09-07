import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Global variable to track current tab - will be set by navigation context
let currentTab: string | null = null;

export const setCurrentTab = (tab: string | null) => {
  currentTab = tab;
  console.log('📍 Notification service: Current tab set to', tab);
};

// Configure notification handler for video invites
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const notificationType = data?.type;
    
    console.log('🔔 Notification received:', {
      type: notificationType,
      title: notification.request.content.title,
      body: notification.request.content.body,
      currentTab
    });
    
    // Always show video invite notifications regardless of current tab
    if (notificationType === 'video_invite') {
      console.log('📹 Showing video invite notification');
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    }
    
    // For other notification types, use existing logic
    const isChatMessage = notificationType === 'chat_message';
    const isOnChatTab = currentTab === 'Chat';
    
    // Suppress chat message notifications if user is on Chat tab
    if (isChatMessage && isOnChatTab) {
      console.log('🔇 Suppressing chat notification - user is on Chat tab');
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export interface NotificationToken {
  token: string;
  type: 'expo' | 'fcm' | 'apns';
  platform: 'ios' | 'android';
  userId: string;
}

/**
 * Register for push notifications and get token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check if running on physical device
    if (!Device.isDevice) {
      console.log('⚠️ Push notifications require a physical device');
      return null;
    }

    // Set up Android notification channels
    if (Platform.OS === 'android') {
      // Chat messages channel
      await Notifications.setNotificationChannelAsync('chat', {
        name: 'Özgün Koçluk - Mesajlar',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        description: 'Özgün Koçluk chat mesajları için bildirimler',
      });

      // Video invites channel (high priority)
      await Notifications.setNotificationChannelAsync('video_invites', {
        name: 'Özgün Koçluk - Video Davetleri',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF0000',
        sound: true, // Enable sound
        description: 'Özgün Koçluk video görüşme davetleri',
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true, // Bypass Do Not Disturb
        enableLights: true,
        enableVibrate: true,
      });
    }

    // Request permissions with explicit iOS options
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('🔔 Requesting push notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: true,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: true,
          allowProvisional: false,
          allowAnnouncements: false,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Push notification permission denied:', finalStatus);
      return null;
    }

    console.log('✅ Push notification permissions granted');

    // Get project ID
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      console.error('❌ Project ID not found in Expo config');
      return null;
    }

    // Get Expo push token
    const expoPushToken = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('✅ Expo push token obtained:', expoPushToken.data);

    return expoPushToken.data;
  } catch (error) {
    console.error('❌ Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Get native device token (FCM for Android, APNs for iOS)
 */
export async function getDeviceToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      return null;
    }

    const deviceToken = await Notifications.getDevicePushTokenAsync();
    console.log('📱 Device token obtained:', deviceToken);
    
    return deviceToken.data;
  } catch (error) {
    console.error('❌ Error getting device token:', error);
    return null;
  }
}

/**
 * Save notification token to database
 */
export async function saveNotificationToken(
  userId: string,
  token: string,
  tokenType: 'expo' | 'fcm' | 'apns' = 'expo'
): Promise<boolean> {
  try {
    // Use the public API endpoint for mobile token registration
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ozgun-v20.vercel.app';
    const response = await fetch(`${apiUrl}/api/notifications/register-token-public`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        token,
        tokenType,
        platform: Platform.OS as 'ios' | 'android',
        deviceInfo: {
          deviceName: Device.deviceName || 'Unknown',
          modelName: Device.modelName || 'Unknown',
          osVersion: Device.osVersion || 'Unknown',
          platform: Platform.OS,
        }
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error saving notification token:', result);
      return false;
    }

    console.log('✅ Notification token saved successfully:', result);
    return true;
  } catch (error) {
    console.error('❌ Error saving notification token:', error);
    return false;
  }
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners(onVideoInviteReceived?: (inviteData: any) => void) {
  // Handle notifications received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('📱 Notification received:', notification);
    
    const data = notification.request.content.data;
    if (data?.type === 'video_invite') {
      console.log('📹 Video invite notification received in foreground');
      if (onVideoInviteReceived) {
        onVideoInviteReceived(data);
      }
    }
  });

  // Handle notification responses (when user taps notification)
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('👆 Notification response:', response);
    
    // Extract data from notification
    const data = response.notification.request.content.data;
    
    // Handle different notification types
    if (data?.type === 'video_invite') {
      console.log('📹 Video invite notification tapped');
      if (onVideoInviteReceived) {
        onVideoInviteReceived(data);
      }
    } else if (data?.type === 'chat_message') {
      console.log('📨 Chat message notification tapped');
      // Navigate to chat screen - implement as needed
    }
  });

  return {
    notificationListener,
    responseListener,
  };
}

/**
 * Initialize push notifications for the current user
 */
export async function initializePushNotifications(
  userId: string, 
  onVideoInviteReceived?: (inviteData: any) => void
): Promise<void> {
  try {
    console.log('🔔 Initializing push notifications for user:', userId);

    // For iOS, prioritize native APNs token for legacy certificate support
    // For Android, use both Expo and FCM tokens
    let primaryTokenSaved = false;

    if (Platform.OS === 'ios') {
      console.log('🍎 iOS detected - requesting permissions first...');
      
      // FIRST: Request permissions (this is critical for iOS!)
      const permissionToken = await registerForPushNotifications();
      if (!permissionToken) {
        console.error('❌ iOS notification permissions denied or failed');
        return;
      }
      
      // SECOND: Get native device token for iOS (APNs) - now with permissions
      const deviceToken = await getDeviceToken();
      if (deviceToken) {
        console.log('📱 iOS APNs device token obtained:', deviceToken.substring(0, 20) + '...');
        console.log('📱 Registering iOS device token for legacy APNs support');
        
        const deviceTokenSaved = await saveNotificationToken(userId, deviceToken, 'apns');
        if (deviceTokenSaved) {
          primaryTokenSaved = true;
          console.log('✅ iOS APNs token saved successfully to database');
        } else {
          console.log('⚠️ Failed to save iOS APNs token, retrying in 5 seconds...');
          setTimeout(async () => {
            const retryResult = await saveNotificationToken(userId, deviceToken, 'apns');
            if (retryResult) {
              console.log('✅ iOS APNs token saved successfully on retry');
            } else {
              console.error('❌ Failed to save iOS APNs token after retry');
            }
          }, 5000);
        }
      } else {
        console.error('❌ Failed to get iOS APNs device token after permission grant');
      }
      
      // Skip Expo token for iOS to avoid FCM server key issues
      console.log('⚠️ Skipping Expo token for iOS - using direct APNs only');
    } else {
      // For Android, prioritize FCM token, then Expo token
      const deviceToken = await getDeviceToken();
      if (deviceToken) {
        console.log('📱 Registering Android FCM token');
        const deviceTokenSaved = await saveNotificationToken(userId, deviceToken, 'fcm');
        if (deviceTokenSaved) {
          primaryTokenSaved = true;
          console.log('✅ Android FCM token saved successfully');
        } else {
          console.log('⚠️ Failed to save Android FCM token, retrying in 5 seconds...');
          setTimeout(async () => {
            const retryResult = await saveNotificationToken(userId, deviceToken, 'fcm');
            if (retryResult) {
              console.log('✅ Android FCM token saved successfully on retry');
            } else {
              console.error('❌ Failed to save Android FCM token after retry');
            }
          }, 5000);
        }
      }

      // Skip Expo token for Android to avoid FCM server key issues
      console.log('⚠️ Skipping Expo token for Android - using direct FCM only');
    }

    if (!primaryTokenSaved) {
      console.log('⚠️ Failed to register any notification tokens');
      return;
    }

    // Setup listeners with video invite handler
    setupNotificationListeners(onVideoInviteReceived);

    console.log('✅ Push notifications initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing push notifications:', error);
    
    // Retry initialization after 10 seconds
    console.log('🔄 Retrying notification initialization in 10 seconds...');
    setTimeout(() => {
      initializePushNotifications(userId, onVideoInviteReceived);
    }, 10000);
  }
}

/**
 * Clean up notification tokens for old user when switching users
 */
export async function cleanupNotificationTokens(userId: string): Promise<void> {
  try {
    console.log('🧹 Cleaning up notification tokens for user:', userId);

    if (!supabase) {
      console.error('❌ Supabase client not available for token cleanup');
      return;
    }

    // Get current session to check if we're cleaning up the current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id === userId) {
      console.log('⚠️ Attempting to clean up current user tokens - this should not happen');
      return;
    }

    // Completely remove all tokens for the old user
    const { error } = await supabase
      .from('notification_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error cleaning up notification tokens:', error);
    } else {
      console.log('✅ Notification tokens completely removed for old user:', userId);
    }
  } catch (error) {
    console.error('❌ Error cleaning up notification tokens:', error);
  }
}

/**
 * Send video invite notification via API
 */
export async function sendVideoInvite(
  toUserId: string, 
  message?: string
): Promise<{ success: boolean; error?: string; inviteId?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase client not available' };
    }

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ozgun-v20.vercel.app';
    
    const response = await fetch(`${apiUrl}/api/notifications/video-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        toUserId,
        message,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error sending video invite:', result);
      return { success: false, error: result.error || 'Failed to send video invite' };
    }

    console.log('✅ Video invite sent successfully:', result);
    return { 
      success: true, 
      inviteId: result.inviteId,
    };
  } catch (error) {
    console.error('❌ Error sending video invite:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get pending video invites
 */
export async function getPendingVideoInvites(): Promise<{
  success: boolean;
  receivedInvites: any[];
  sentInvites: any[];
  error?: string;
}> {
  try {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ozgun-v20.vercel.app';
    
    const response = await fetch(`${apiUrl}/api/notifications/video-invite`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Error fetching video invites:', result);
      return { 
        success: false, 
        receivedInvites: [], 
        sentInvites: [], 
        error: result.error || 'Failed to fetch video invites' 
      };
    }

    return {
      success: true,
      receivedInvites: result.receivedInvites || [],
      sentInvites: result.sentInvites || [],
    };
  } catch (error) {
    console.error('❌ Error fetching video invites:', error);
    return {
      success: false,
      receivedInvites: [],
      sentInvites: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}