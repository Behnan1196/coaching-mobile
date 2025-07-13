import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device'; // Will be installed separately
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Task } from '../types/database';

// Set up notification channels for Android and categories for iOS
export const setupNotificationChannels = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync('video_calls', {
      name: 'Video Calls',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync('session_reminders', {
      name: 'Session Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync('test_notifications', {
      name: 'Test Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F59E0B',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    // Debug: Log current notification channels
    try {
      const channels = await Notifications.getNotificationChannelsAsync();
      // Keep minimal logging for debugging channel configuration
    } catch (error) {
      console.error('❌ [DEBUG] Could not get notification channels:', error);
    }
  } else if (Platform.OS === 'ios') {
    // iOS Categories
    await Notifications.setNotificationCategoryAsync('video_call', [
      {
        identifier: 'accept_call',
        buttonTitle: 'Accept',
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: 'decline_call',
        buttonTitle: 'Decline',
        options: {
          isDestructive: true,
          isAuthenticationRequired: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('session_reminder', [
      {
        identifier: 'join_session',
        buttonTitle: 'Join',
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
    ]);
  }
};

// Configure how notifications should be handled when app is running
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const { data, title, body } = notification.request.content;
    
    // Platform-specific handling
    if (Platform.OS === 'ios') {
      // For video call invites on iOS, show with high priority
      if (data?.type === 'video_call_invite' || data?.type === 'incoming_call') {
        return {
          shouldShowAlert: true,   // Show alert banner
          shouldPlaySound: true,   // Play sound
          shouldSetBadge: true,    // Set badge
          priority: Notifications.AndroidNotificationPriority.HIGH, // High priority
        };
      }
      
      // For other notifications on iOS, also show with sound
      return {
        shouldShowAlert: true,   // Always show alert on iOS
        shouldPlaySound: true,   // Always play sound on iOS
        shouldSetBadge: true,    // Set badge
      };
    }
    
    // Android handling
    if (Platform.OS === 'android') {
      // For video call invites and incoming calls, show as proper notification with sound
      if (data?.type === 'video_call_invite' || data?.type === 'incoming_call') {
        return {
          shouldShowAlert: true,   // Show as proper notification
          shouldPlaySound: true,   // Play sound
          shouldSetBadge: true,    // Set badge
          priority: Notifications.AndroidNotificationPriority.HIGH,
        };
      }
      
      // For session reminders, also show with sound
      if (data?.type === 'session_reminder') {
        return {
          shouldShowAlert: true,   // Show as proper notification
          shouldPlaySound: true,   // Play sound
          shouldSetBadge: true,    // Set badge
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        };
      }
      
      // For test notifications, also show with sound
      if (data?.type === 'test_notification' || data?.type === 'test_cross_user') {
        return {
          shouldShowAlert: true,   // Show as proper notification
          shouldPlaySound: true,   // Play sound
          shouldSetBadge: true,    // Set badge
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        };
      }
      
      // For regular notifications, show as notification with sound
      return {
        shouldShowAlert: true,   // Show as proper notification (not just badge)
        shouldPlaySound: true,   // Play sound
        shouldSetBadge: true,    // Set badge
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      };
    }
    
    // Fallback for other platforms
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    // Set up notification channels first
    await setupNotificationChannels();

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    let finalStatus = existingStatus;
    
    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
          allowCriticalAlerts: true,
          allowDisplayInCarPlay: true,
          allowProvisional: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('⚠️ [NOTIFICATIONS] Permission not granted for push notifications');
      return null;
    }
    
    // Get push token
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      return token.data;
    } catch (tokenError: any) {
      console.error('❌ [NOTIFICATIONS] Token error details:', {
        error: tokenError,
        platform: Platform.OS,
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      // Platform-specific error handling
      if (Platform.OS === 'android') {
        // Check for common Android Firebase issues
        if (tokenError.message?.includes('SERVICE_NOT_AVAILABLE')) {
          console.warn('⚠️ [NOTIFICATIONS] Android Firebase not configured - push notifications disabled for development');
          console.warn('   To enable: Set up Firebase and add google-services.json');
        }
      }
      
      return null;
    }
  } catch (error: any) {
    console.error('❌ [NOTIFICATIONS] Error registering for push notifications:', error.message);
    console.error('❌ [NOTIFICATIONS] Full error:', error);
    return null;
  }
};

export const sendPushNotificationToUser = async (
  userId: string, 
  title: string, 
  body: string, 
  data: any = {}
): Promise<boolean> => {
  try {
    const apiUrl = `${Constants.expoConfig?.extra?.supabaseUrl}/functions/v1/push-notification`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Constants.expoConfig?.extra?.supabaseAnonKey}`,
      },
      body: JSON.stringify({
        userId,
        title,
        body,
        data,
      }),
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      return true;
    } else {
      console.error('❌ [PUSH] Notification failed:', result.error);
      console.error('❌ [PUSH] Error details:', result.results);
      console.error('❌ [PUSH] Debug info:', result.debug);
      return false;
    }
  } catch (error) {
    console.error('❌ [PUSH] Error sending notification:', error);
    console.error('❌ [PUSH] Error details:', {
      userId,
      title,
      body,
      data,
      platform: Platform.OS,
    });
    return false;
  }
};

export const sendSessionNotificationToStudent = async (
  studentId: string,
  sessionTitle: string,
  sessionDate: string,
  sessionTime: string
): Promise<boolean> => {
  return await sendPushNotificationToUser(
    studentId,
    '📅 Yeni Koçluk Seansı',
    `${sessionTitle} - ${sessionDate} ${sessionTime}`,
    {
      type: 'new_session',
      sessionTitle,
      sessionDate,
      sessionTime,
    }
  );
};

export const sendCallInvitationToUser = async (
  userId: string,
  callerName: string,
  callId: string
): Promise<boolean> => {
  return await sendPushNotificationToUser(
    userId,
    '📞 Gelen Görüşme',
    `${callerName} sizi video görüşmeye çağırıyor`,
    {
      type: 'call_invitation',
      callerName,
      callId,
    }
  );
};

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    // For now, assume we're on a physical device
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }

  static async sendSessionReminder(
    userId: string, 
    sessionTitle: string, 
    sessionTime: string, 
    sessionId: string,
    minutesBeforeSession: number = 15
  ) {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }

      // Get user's device token
      const { data: tokenData } = await supabase
        .from('device_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();

      if (!tokenData?.token) {
        console.error('No device token found for user:', userId);
        return;
      }

      // Send push notification
      const notificationData = {
        type: 'session_reminder',
        sessionId,
        sessionTitle,
        sessionTime,
        minutesBeforeSession,
      };

      const success = await sendPushNotificationToUser(
        userId,
        'Ders Hatırlatması',
        `"${sessionTitle}" dersiniz ${minutesBeforeSession} dakika sonra başlayacak (${sessionTime})`,
        notificationData
      );

      if (success) {
        // Session reminder notification sent successfully
      }
    } catch (error) {
      console.error('Error sending session reminder:', error);
    }
  }

  static async scheduleSessionReminders(session: Task) {
    try {
      if (!session.scheduled_date || !session.scheduled_start_time) {
        console.error('Session missing date or time, cannot schedule reminders');
        return;
      }

      // Parse session datetime
      const [hours, minutes] = session.scheduled_start_time.split(':').map(Number);
      const sessionDateTime = new Date(session.scheduled_date);
      sessionDateTime.setHours(hours, minutes, 0, 0);

      const now = new Date();
      
      // Don't schedule reminders for past sessions
      if (sessionDateTime <= now) {
        console.error('Session is in the past, not scheduling reminders');
        return;
      }

      // Calculate reminder times
      const reminderTimes = [
        { minutes: 24 * 60, label: '24 saat' }, // 24 hours
        { minutes: 60, label: '1 saat' },      // 1 hour
        { minutes: 15, label: '15 dakika' },   // 15 minutes
      ];

      for (const reminder of reminderTimes) {
        const reminderTime = new Date(sessionDateTime.getTime() - (reminder.minutes * 60 * 1000));
        
        // Only schedule if reminder time is in the future
        if (reminderTime > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Ders Hatırlatması',
              body: `"${session.title}" dersiniz ${reminder.label} sonra başlayacak`,
              data: {
                type: 'session_reminder',
                sessionId: session.id,
                sessionTitle: session.title,
                sessionTime: session.scheduled_start_time,
                minutesBeforeSession: reminder.minutes,
              },
              sound: 'default',
              ...(Platform.OS === 'android' && {
                channelId: 'session_reminders',
              }),
            },
            trigger: {
              date: reminderTime,
            },
          });
          
          console.log(`${reminder.label} reminder scheduled for session:`, session.id);
        }
      }
    } catch (error) {
      console.error('Error scheduling session reminders:', error);
    }
  }

  static async cancelSessionReminders(sessionId: string) {
    try {
      // Cancel all notifications for this session
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const sessionNotifications = allNotifications.filter(notification => 
        notification.content.data?.sessionId === sessionId
      );

      for (const notification of sessionNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
      
      console.log('Cancelled reminder for session:', sessionId);
    } catch (error) {
      console.error('Error cancelling session reminders:', error);
    }
  }

  static async sendCallNotification(studentId: string, coachName: string, callId: string) {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }

      // Get student's device token
      const { data: tokenData } = await supabase
        .from('device_tokens')
        .select('token')
        .eq('user_id', studentId)
        .single();

      if (!tokenData?.token) {
        console.error('No device token found for student:', studentId);
        return;
      }

      // Send push notification
      const notificationData = {
        type: 'video_call_invite',
        callId,
        coachName,
        timestamp: new Date().toISOString(),
      };

      const success = await sendPushNotificationToUser(
        studentId,
        'Video Görüşme Daveti',
        `${coachName} sizi video görüşmeye davet ediyor`,
        notificationData
      );

      if (success) {
        // Push notification sent successfully
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  static setupNotificationListeners() {
    // Handle notifications when app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      
      // Handle specific notification types
      if (notification.request.content.data?.type === 'video_call_invite') {
        console.log('Handling incoming call from push notification');
        // Handle incoming call
      } else if (notification.request.content.data?.type === 'session_reminder') {
        const sessionId = notification.request.content.data?.sessionId;
        console.log('Session reminder received:', sessionId);
      } else if (notification.request.content.data?.type === 'new_task') {
        const taskId = notification.request.content.data?.taskId;
        console.log('New coaching session created:', taskId);
      } else if (notification.request.content.data?.type === 'task_update') {
        const taskId = notification.request.content.data?.taskId;
        console.log('Coaching session updated:', taskId);
      }
    });

    // Handle notification responses (when user taps on notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      
      // Handle specific responses
      if (response.notification.request.content.data?.type === 'video_call_invite') {
        console.log('User tapped call notification, opening app');
        // Navigate to video call screen
      } else if (response.notification.request.content.data?.type === 'session_reminder') {
        console.log('User tapped session reminder, opening app');
        // Navigate to session screen
      } else {
        console.log('User tapped session notification, opening home screen');
        // Navigate to home screen
      }
    });

    // Return cleanup function
    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }
}

export default NotificationService; 