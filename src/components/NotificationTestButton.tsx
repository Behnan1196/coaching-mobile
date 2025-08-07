import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { sendTestNotification } from '../lib/notifications';

interface NotificationTestButtonProps {
  expoPushToken?: string;
}

export const NotificationTestButton: React.FC<NotificationTestButtonProps> = ({ 
  expoPushToken 
}) => {
  const [loading, setLoading] = useState(false);

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
});
