import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { sendTestNotification, debugCleanupAllTokens, checkNotificationTokenStatus, smartCleanupTokens } from '../lib/notifications';
import { useAuth } from '../contexts/AuthContext';

interface NotificationTestButtonProps {
  expoPushToken?: string;
}

export const NotificationTestButton: React.FC<NotificationTestButtonProps> = ({ 
  expoPushToken 
}) => {
  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [smartCleanupLoading, setSmartCleanupLoading] = useState(false);
  const { user } = useAuth();

  const handleTestNotification = async () => {
    if (!expoPushToken) {
      Alert.alert(
        'No Token',
        'No Expo push token available. Please ensure notifications are properly initialized.'
      );
      return;
    }

    try {
      setLoading(true);
      await sendTestNotification(expoPushToken);
      Alert.alert(
        '✅ Test Sent',
        'Test notification has been sent! You should receive it shortly.'
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert(
        '❌ Error',
        'Failed to send test notification. Check console for details.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDebugCleanup = async () => {
    if (!user?.id) {
      Alert.alert('No User', 'No authenticated user found.');
      return;
    }

    Alert.alert(
      'Debug Cleanup',
      'This will remove ALL notification tokens for the current user. This is useful for troubleshooting notification issues. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clean Up',
          style: 'destructive',
          onPress: async () => {
            try {
              setCleanupLoading(true);
              await debugCleanupAllTokens(user.id);
              Alert.alert(
                '✅ Cleanup Complete',
                'All notification tokens have been removed. You may need to re-initialize notifications.'
              );
            } catch (error) {
              console.error('Error during debug cleanup:', error);
              Alert.alert(
                '❌ Error',
                'Failed to clean up tokens. Check console for details.'
              );
            } finally {
              setCleanupLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSmartCleanup = async () => {
    if (!user?.id) {
      Alert.alert('No User', 'No authenticated user found.');
      return;
    }

    Alert.alert(
      'Smart Cleanup',
      'This will remove notification tokens from OTHER users while preserving YOUR tokens. This ensures you can still receive notifications. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clean Up',
          style: 'default',
          onPress: async () => {
            try {
              setSmartCleanupLoading(true);
              await smartCleanupTokens();
              Alert.alert(
                '✅ Smart Cleanup Complete',
                'Old user tokens have been removed while preserving your current tokens. You should still receive notifications.'
              );
            } catch (error) {
              console.error('Error during smart cleanup:', error);
              Alert.alert(
                '❌ Error',
                'Failed to perform smart cleanup. Check console for details.'
              );
            } finally {
              setSmartCleanupLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleStatusCheck = async () => {
    try {
      setStatusLoading(true);
      const status = await checkNotificationTokenStatus();
      
      if (status) {
        const summary = status.summary;
        Alert.alert(
          '📊 Token Status',
          `Total Tokens: ${status.totalTokens}\n\n` +
          `Platforms:\n` +
          `• iOS: ${summary.ios}\n` +
          `• Android: ${summary.android}\n` +
          `• Web: ${summary.web}\n\n` +
          `Types:\n` +
          `• Expo: ${summary.expo}\n` +
          `• FCM: ${summary.fcm}\n` +
          `• APNs: ${summary.apns}\n\n` +
          `Status:\n` +
          `• Active: ${summary.active}\n` +
          `• Inactive: ${summary.inactive}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Status', 'Unable to retrieve token status. Check console for details.');
      }
    } catch (error) {
      console.error('Error checking token status:', error);
      Alert.alert('Error', 'Failed to check token status.');
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleTestNotification}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? '🧪 Sending...' : '🧪 Test Notification'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.statusButton, statusLoading && styles.buttonDisabled]}
        onPress={handleStatusCheck}
        disabled={statusLoading}
      >
        <Text style={styles.buttonText}>
          {statusLoading ? '🔍 Checking...' : '🔍 Check Status'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.smartButton, smartCleanupLoading && styles.buttonDisabled]}
        onPress={handleSmartCleanup}
        disabled={smartCleanupLoading}
      >
        <Text style={styles.buttonText}>
          {smartCleanupLoading ? '🧠 Cleaning...' : '🧠 Smart Cleanup'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.debugButton, cleanupLoading && styles.buttonDisabled]}
        onPress={handleDebugCleanup}
        disabled={cleanupLoading}
      >
        <Text style={styles.buttonText}>
          {cleanupLoading ? '🧹 Cleaning...' : '🧹 Debug Cleanup'}
        </Text>
      </TouchableOpacity>
      
      {!expoPushToken && (
        <Text style={styles.warningText}>
          ⚠️ No push token available
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    margin: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  warningText: {
    marginTop: 8,
    fontSize: 12,
    color: '#dc3545',
    textAlign: 'center',
  },
  debugButton: {
    backgroundColor: '#6c757d',
    marginTop: 10,
  },
  statusButton: {
    backgroundColor: '#28a745',
    marginTop: 10,
  },
  smartButton: {
    backgroundColor: '#ffc107',
    marginTop: 10,
  },
});
