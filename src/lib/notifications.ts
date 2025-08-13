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

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const isChatMessage = data?.type === 'chat_message';
    const isOnChatTab = currentTab === 'Chat';
    
    // Suppress chat message notifications if user is on Chat tab
    if (isChatMessage && isOnChatTab) {
      console.log('🔇 Suppressing chat notification - user is on Chat tab');
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }
    
    console.log('🔔 Showing notification:', {
      type: data?.type,
      currentTab,
      shouldShow: !isChatMessage || !isOnChatTab
    });
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
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

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('chat', {
        name: 'Özgün Koçluk - Mesajlar',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        description: 'Özgün Koçluk chat mesajları için bildirimler',
      });
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Push notification permission denied');
      return null;
    }

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
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ozgun-v15.vercel.app';
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
export function setupNotificationListeners() {
  // Handle notifications received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('📱 Notification received:', notification);
    // You can customize foreground notification behavior here
  });

  // Handle notification responses (when user taps notification)
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('👆 Notification response:', response);
    
    // Extract data from notification
    const data = response.notification.request.content.data;
    
    // Handle different notification types
    if (data?.type === 'chat_message') {
      // Navigate to chat screen
      // You'll need to implement navigation logic here
      console.log('📨 Chat message notification tapped');
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
export async function initializePushNotifications(userId: string): Promise<void> {
  try {
    console.log('🔔 Initializing push notifications for user:', userId);

    // Register for push notifications
    const expoPushToken = await registerForPushNotifications();
    if (!expoPushToken) {
      console.log('⚠️ Failed to get push token');
      return;
    }

    // Save token to database with retry logic
    const expTokenSaved = await saveNotificationToken(userId, expoPushToken, 'expo');
    if (!expTokenSaved) {
      console.log('⚠️ Failed to save Expo token, retrying in 5 seconds...');
      setTimeout(async () => {
        const retryResult = await saveNotificationToken(userId, expoPushToken, 'expo');
        if (retryResult) {
          console.log('✅ Expo token saved successfully on retry');
        } else {
          console.error('❌ Failed to save Expo token after retry');
        }
      }, 5000);
    }

    // Also get and save device token for direct FCM/APNs
    const deviceToken = await getDeviceToken();
    if (deviceToken) {
      const tokenType = Platform.OS === 'ios' ? 'apns' : 'fcm';
      const deviceTokenSaved = await saveNotificationToken(userId, deviceToken, tokenType);
      if (!deviceTokenSaved) {
        console.log(`⚠️ Failed to save ${tokenType} token, retrying in 5 seconds...`);
        setTimeout(async () => {
          const retryResult = await saveNotificationToken(userId, deviceToken, tokenType);
          if (retryResult) {
            console.log(`✅ ${tokenType} token saved successfully on retry`);
          } else {
            console.error(`❌ Failed to save ${tokenType} token after retry`);
          }
        }, 5000);
      }
    }

    // Setup listeners
    setupNotificationListeners();

    console.log('✅ Push notifications initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing push notifications:', error);
    
    // Retry initialization after 10 seconds
    console.log('🔄 Retrying notification initialization in 10 seconds...');
    setTimeout(() => {
      initializePushNotifications(userId);
    }, 10000);
  }
}

/**
 * Clean up notification tokens for old user when switching users
 */
export async function cleanupNotificationTokens(userId: string): Promise<void> {
  try {
    console.log('🧹 Cleaning up notification tokens for user:', userId);

    const { error } = await supabase
      .from('notification_tokens')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error cleaning up notification tokens:', error);
    } else {
      console.log('✅ Notification tokens cleaned up successfully');
    }
  } catch (error) {
    console.error('❌ Error cleaning up notification tokens:', error);
  }
}

/**
 * Send a test notification (for debugging)
 */
export async function sendTestNotification(expoPushToken: string): Promise<void> {
  try {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title: '🧪 Özgün Koçluk Test',
      body: 'Bildirimler çalışıyor!',
      data: { 
        type: 'test',
        timestamp: new Date().toISOString() 
      },
      channelId: 'chat', // Android channel
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('📤 Test notification sent:', result);
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
  }
}
