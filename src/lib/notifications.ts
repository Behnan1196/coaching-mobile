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
        shouldShowBanner: false,
        shouldShowList: false,
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

    // For iOS, prioritize native APNs token for legacy certificate support
    // For Android, use both Expo and FCM tokens
    let primaryTokenSaved = false;

    if (Platform.OS === 'ios') {
      // Get native device token for iOS (APNs)
      const deviceToken = await getDeviceToken();
      if (deviceToken) {
        console.log('📱 Registering iOS device token for legacy APNs support');
        const deviceTokenSaved = await saveNotificationToken(userId, deviceToken, 'apns');
        if (deviceTokenSaved) {
          primaryTokenSaved = true;
          console.log('✅ iOS APNs token saved successfully');
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
      }
      
      // Also register Expo token as fallback for iOS
      const expoPushToken = await registerForPushNotifications();
      if (expoPushToken) {
        const expTokenSaved = await saveNotificationToken(userId, expoPushToken, 'expo');
        if (expTokenSaved) {
          console.log('✅ iOS Expo fallback token saved successfully');
        }
      }
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

      // Also register Expo token as fallback for Android
      const expoPushToken = await registerForPushNotifications();
      if (expoPushToken) {
        const expTokenSaved = await saveNotificationToken(userId, expoPushToken, 'expo');
        if (expTokenSaved && !primaryTokenSaved) {
          primaryTokenSaved = true;
          console.log('✅ Android Expo token saved successfully');
        }
      }
    }

    if (!primaryTokenSaved) {
      console.log('⚠️ Failed to register any notification tokens');
      return;
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
 * This function should only be called when switching to a different user
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
 * Clean up notification tokens for current user before switching to new user
 * This ensures no old tokens remain active
 */
export async function cleanupCurrentUserTokens(): Promise<void> {
  try {
    if (!supabase) {
      console.error('❌ Supabase client not available for token cleanup');
      return;
    }

    // Get current session to identify current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id) {
      console.log('🧹 Cleaning up current user tokens before switch:', session.user.id);
      await cleanupNotificationTokens(session.user.id);
    }
  } catch (error) {
    console.error('❌ Error cleaning up current user tokens:', error);
  }
}

/**
 * Clean up any leftover notification tokens from previous sessions
 * This should be called when the app starts to ensure no old tokens remain
 * BUT preserves the current user's tokens
 */
export async function cleanupLeftoverTokens(): Promise<void> {
  try {
    console.log('🧹 Checking for leftover notification tokens...');
    
    if (!supabase) {
      console.error('❌ Supabase client not available for token cleanup');
      return;
    }
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.id) {
      console.log('⚠️ No active session, skipping leftover token cleanup');
      return;
    }
    
    const currentUserId = session.user.id;
    console.log('👤 Current user ID:', currentUserId);
    
    // Get all tokens for the current user
    const { data: currentUserTokens, error: currentUserError } = await supabase
      .from('notification_tokens')
      .select('*')
      .eq('user_id', currentUserId);
    
    if (currentUserError) {
      console.error('❌ Error fetching current user tokens:', currentUserError);
      return;
    }
    
    // Get all tokens for other users (potential leftover tokens)
    const { data: otherUserTokens, error: otherUserError } = await supabase
      .from('notification_tokens')
      .select('*')
      .neq('user_id', currentUserId);
    
    if (otherUserError) {
      console.error('❌ Error fetching other user tokens:', otherUserError);
      return;
    }
    
    // Clean up tokens from other users (these are leftover from previous sessions)
    if (otherUserTokens && otherUserTokens.length > 0) {
      console.log(`🧹 Found ${otherUserTokens.length} leftover tokens from other users, cleaning up...`);
      
      const { error: deleteError } = await supabase
        .from('notification_tokens')
        .delete()
        .neq('user_id', currentUserId);
      
      if (deleteError) {
        console.error('❌ Error cleaning up leftover tokens from other users:', deleteError);
      } else {
        console.log('✅ Leftover tokens from other users cleaned up successfully');
      }
    } else {
      console.log('✅ No leftover tokens from other users found');
    }
    
    // Log current user's token status
    if (currentUserTokens && currentUserTokens.length > 0) {
      console.log(`✅ Current user has ${currentUserTokens.length} active notification tokens`);
      currentUserTokens.forEach(token => {
        console.log(`  - ${token.platform} (${token.token_type}): ${token.is_active ? 'Active' : 'Inactive'}`);
      });
    } else {
      console.log('⚠️ Current user has no notification tokens');
    }
  } catch (error) {
    console.error('❌ Error in leftover token cleanup:', error);
  }
}

/**
 * Smart cleanup function that only removes tokens for users other than the current user
 * This preserves the current user's ability to receive notifications
 */
export async function smartCleanupTokens(): Promise<void> {
  try {
    console.log('🧠 Performing smart token cleanup...');
    
    if (!supabase) {
      console.error('❌ Supabase client not available for smart cleanup');
      return;
    }
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.id) {
      console.log('⚠️ No active session, skipping smart cleanup');
      return;
    }
    
    const currentUserId = session.user.id;
    
    // Remove all tokens except the current user's
    const { error } = await supabase
      .from('notification_tokens')
      .delete()
      .neq('user_id', currentUserId);
    
    if (error) {
      console.error('❌ Error during smart cleanup:', error);
    } else {
      console.log('✅ Smart cleanup completed - preserved current user tokens');
    }
  } catch (error) {
    console.error('❌ Error in smart cleanup:', error);
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

/**
 * Debug function: Manually clean up all notification tokens for a specific user
 * This is useful for troubleshooting notification issues
 */
export async function debugCleanupAllTokens(userId: string): Promise<void> {
  try {
    console.log('🐛 DEBUG: Cleaning up ALL notification tokens for user:', userId);
    
    if (!supabase) {
      console.error('❌ Supabase client not available for debug cleanup');
      return;
    }

    // First, get all tokens for the user
    const { data: tokens, error: fetchError } = await supabase
      .from('notification_tokens')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('❌ Error fetching tokens for debug cleanup:', fetchError);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('✅ No tokens found for user:', userId);
      return;
    }

    console.log(`🐛 Found ${tokens.length} tokens to clean up:`, tokens.map(t => ({
      id: t.id,
      platform: t.platform,
      token_type: t.token_type,
      is_active: t.is_active,
      created_at: t.created_at
    })));

    // Delete all tokens for the user
    const { error: deleteError } = await supabase
      .from('notification_tokens')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('❌ Error during debug cleanup:', deleteError);
    } else {
      console.log(`✅ Successfully cleaned up ${tokens.length} tokens for user:`, userId);
    }
  } catch (error) {
    console.error('❌ Error in debug cleanup:', error);
  }
}

/**
 * Check current notification token status for debugging
 */
export async function checkNotificationTokenStatus(): Promise<any> {
  try {
    console.log('🔍 Checking notification token status...');
    
    if (!supabase) {
      console.error('❌ Supabase client not available for token status check');
      return null;
    }
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.id) {
      console.log('⚠️ No active session for token status check');
      return null;
    }
    
    // Get all tokens for the current user
    const { data: tokens, error } = await supabase
      .from('notification_tokens')
      .select('*')
      .eq('user_id', session.user.id);
    
    if (error) {
      console.error('❌ Error fetching token status:', error);
      return null;
    }
    
    const status = {
      userId: session.user.id,
      totalTokens: tokens?.length || 0,
      tokens: tokens || [],
      summary: {
        ios: tokens?.filter(t => t.platform === 'ios').length || 0,
        android: tokens?.filter(t => t.platform === 'android').length || 0,
        web: tokens?.filter(t => t.platform === 'web').length || 0,
        expo: tokens?.filter(t => t.token_type === 'expo').length || 0,
        fcm: tokens?.filter(t => t.token_type === 'fcm').length || 0,
        apns: tokens?.filter(t => t.token_type === 'apns').length || 0,
        active: tokens?.filter(t => t.is_active).length || 0,
        inactive: tokens?.filter(t => !t.is_active).length || 0,
      }
    };
    
    console.log('🔍 Token status:', status);
    return status;
  } catch (error) {
    console.error('❌ Error checking token status:', error);
    return null;
  }
}
