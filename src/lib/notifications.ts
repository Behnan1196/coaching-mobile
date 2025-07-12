import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device'; // Will be installed separately
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Task } from '../types/database';

// Configure how notifications should be handled when app is running
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    console.log('📱 [NOTIFICATIONS] Registering for push notifications...');

    // Check if we have permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ [NOTIFICATIONS] Permission not granted for push notifications');
      return null;
    }

    try {
      // Get the push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '7cd95625-11cc-40e0-967a-f09e46a57e58',
      });

      const token = tokenData.data;
      console.log('✅ [NOTIFICATIONS] Push token obtained:', token);
      return token;
    } catch (tokenError: any) {
      // Handle Firebase/FCM errors gracefully for development
      if (Platform.OS === 'android' && tokenError.message?.includes('FirebaseApp')) {
        console.warn('⚠️ [NOTIFICATIONS] Android Firebase not configured - push notifications disabled for development');
        console.warn('   To enable: Set up Firebase and add google-services.json');
        return null;
      }
      throw tokenError;
    }
  } catch (error: any) {
    console.error('❌ [NOTIFICATIONS] Error registering for push notifications:', error.message);
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
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    
    console.log(`📤 [PUSH] Sending notification to user ${userId}: ${title}`);
    
    const response = await fetch(`${apiUrl}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        title,
        body,
        data,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ [PUSH] Notification sent successfully');
      return true;
    } else {
      console.error('❌ [PUSH] Notification failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ [PUSH] Error sending notification:', error);
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
      // Get user's device token
      if (!supabase) {
        console.log('Supabase client not available');
        return;
      }
      
      const { data: tokenData } = await supabase
        .from('device_tokens')
        .select('token')
        .eq('user_id', userId)
        .single();

      if (!tokenData?.token) {
        console.log('No device token found for user:', userId);
        return;
      }

      // Send push notification via Expo Push Service
      const message = {
        to: tokenData.token,
        sound: 'default',
        title: 'Koçluk Seansı Hatırlatması',
        body: `${sessionTitle} ${minutesBeforeSession} dakika sonra başlayacak (${sessionTime})`,
        data: {
          type: 'session_reminder',
          sessionId: sessionId,
          sessionTitle: sessionTitle,
          sessionTime: sessionTime,
        },
        priority: 'default',
        channelId: 'session_reminders',
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
      console.log('Session reminder notification sent:', result);
    } catch (error) {
      console.error('Error sending session reminder:', error);
    }
  }

  static async scheduleSessionReminders(session: Task) {
    try {
      if (!session.scheduled_date || !session.scheduled_start_time) {
        console.log('Session missing date or time, cannot schedule reminders');
        return;
      }

      const sessionDate = new Date(session.scheduled_date);
      const [hours, minutes] = session.scheduled_start_time.split(':').map(Number);
      sessionDate.setHours(hours, minutes, 0, 0);

      const now = new Date();
      const sessionTimeMs = sessionDate.getTime();
      
      // Don't schedule reminders for past sessions
      if (sessionTimeMs <= now.getTime()) {
        console.log('Session is in the past, not scheduling reminders');
        return;
      }

      // Schedule 24-hour reminder
      const reminder24h = sessionTimeMs - (24 * 60 * 60 * 1000);
      if (reminder24h > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Koçluk Seansı Hatırlatması',
            body: `${session.title} yarın ${session.scheduled_start_time} saatinde başlayacak`,
            data: {
              type: 'session_reminder',
              sessionId: session.id,
              sessionTitle: session.title,
              sessionTime: session.scheduled_start_time,
            },
          },
          trigger: new Date(reminder24h),
        });
        console.log('24-hour reminder scheduled for session:', session.id);
      }

      // Schedule 1-hour reminder
      const reminder1h = sessionTimeMs - (60 * 60 * 1000);
      if (reminder1h > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Koçluk Seansı Hatırlatması',
            body: `${session.title} 1 saat sonra başlayacak (${session.scheduled_start_time})`,
            data: {
              type: 'session_reminder',
              sessionId: session.id,
              sessionTitle: session.title,
              sessionTime: session.scheduled_start_time,
            },
          },
          trigger: new Date(reminder1h),
        });
        console.log('1-hour reminder scheduled for session:', session.id);
      }

      // Schedule 15-minute reminder
      const reminder15m = sessionTimeMs - (15 * 60 * 1000);
      if (reminder15m > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Koçluk Seansı Yaklaşıyor!',
            body: `${session.title} 15 dakika sonra başlayacak. Hazır olun!`,
            data: {
              type: 'session_reminder',
              sessionId: session.id,
              sessionTitle: session.title,
              sessionTime: session.scheduled_start_time,
            },
          },
          trigger: new Date(reminder15m),
        });
        console.log('15-minute reminder scheduled for session:', session.id);
      }

    } catch (error) {
      console.error('Error scheduling session reminders:', error);
    }
  }

  static async cancelSessionReminders(sessionId: string) {
    try {
      // Get all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Find and cancel notifications for this session
      for (const notification of scheduledNotifications) {
        const data = notification.content.data;
        if (data?.type === 'session_reminder' && data?.sessionId === sessionId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          console.log('Cancelled reminder for session:', sessionId);
        }
      }
    } catch (error) {
      console.error('Error cancelling session reminders:', error);
    }
  }

  static async sendCallNotification(studentId: string, coachName: string, callId: string) {
    try {
      // Get student's device token
      if (!supabase) {
        console.log('Supabase client not available');
        return;
      }
      
      const { data: tokenData } = await supabase
        .from('device_tokens')
        .select('token')
        .eq('user_id', studentId)
        .single();

      if (!tokenData?.token) {
        console.log('No device token found for student:', studentId);
        return;
      }

      // Send push notification via Expo Push Service
      const message = {
        to: tokenData.token,
        sound: 'default',
        title: 'Incoming Call',
        body: `${coachName} is calling you`,
        data: {
          type: 'incoming_call',
          callId: callId,
          coachName: coachName,
        },
        priority: 'high',
        channelId: 'calls',
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
      console.log('Push notification sent:', result);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  static setupNotificationListeners() {
    // Handle notification when app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received in foreground:', notification);
        const { type, callId, coachName, sessionId, taskId } = notification.request.content.data || {};
        
        if (type === 'incoming_call') {
          // Handle incoming call notification
          console.log('Handling incoming call from push notification');
          // You can trigger your existing handleIncomingCall logic here
        } else if (type === 'session_reminder') {
          // Handle session reminder notification
          console.log('Session reminder received:', sessionId);
          // Could show an in-app alert or update the UI
        } else if (type === 'new_coaching_session') {
          // Handle new coaching session notification
          console.log('New coaching session created:', taskId);
          // Could refresh session list or show alert
        } else if (type === 'session_updated') {
          // Handle coaching session update notification
          console.log('Coaching session updated:', taskId);
          // Could refresh session list and show update alert
        }
      }
    );

    // Handle notification when app is backgrounded/closed
    const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response received:', response);
        const { type, callId, coachName, sessionId, taskId } = response.notification.request.content.data || {};
        
        if (type === 'incoming_call') {
          // Navigate to video call screen or show incoming call
          console.log('User tapped call notification, opening app');
          // You can use navigation to go to video call screen
        } else if (type === 'session_reminder') {
          // Navigate to home screen to show upcoming sessions
          console.log('User tapped session reminder, opening app');
          // You can use navigation to go to home screen
        } else if (type === 'new_coaching_session' || type === 'session_updated') {
          // Navigate to home screen to show updated sessions
          console.log('User tapped session notification, opening home screen');
          // You can use navigation to go to home screen
        }
      }
    );

    return () => {
      foregroundSubscription.remove();
      backgroundSubscription.remove();
    };
  }
}

export default NotificationService; 