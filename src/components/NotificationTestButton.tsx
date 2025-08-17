import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { 
  cleanupNotificationTokens, 
  cleanupLeftoverTokens, 
  smartCleanupTokens,
  debugCleanupAllTokens,
  checkNotificationTokenStatus 
} from '../lib/notifications';
import { useAuth } from '../contexts/AuthContext';

interface ConnectionStatusProps {
  isConnected: boolean;
  lastError: string | null;
  onReconnect: () => void;
  label: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  lastError, 
  onReconnect, 
  label 
}) => (
  <View style={styles.connectionStatus}>
    <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
    <Text style={styles.statusText}>
      {label}: {isConnected ? 'Connected' : 'Disconnected'}
    </Text>
    {lastError && (
      <Text style={styles.errorText} numberOfLines={2}>
        Error: {lastError}
      </Text>
    )}
    {!isConnected && (
      <TouchableOpacity style={styles.reconnectButton} onPress={onReconnect}>
        <Text style={styles.reconnectText}>Reconnect</Text>
      </TouchableOpacity>
    )}
  </View>
);

export const NotificationTestButton: React.FC = () => {
  const { user } = useAuth();

  const handleDebugCleanup = async () => {
    if (!user) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    Alert.alert(
      'Debug Cleanup',
      `This will delete ALL notification tokens for user ${user.id}. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await debugCleanupAllTokens(user.id);
              Alert.alert('Success', 'All tokens deleted');
            } catch (error) {
              Alert.alert('Error', `Failed to delete tokens: ${error}`);
            }
          }
        }
      ]
    );
  };

  const handleStatusCheck = async () => {
    try {
      await checkNotificationTokenStatus();
      Alert.alert('Success', 'Status check completed. Check console for details.');
    } catch (error) {
      Alert.alert('Error', `Status check failed: ${error}`);
    }
  };

  const handleSmartCleanup = async () => {
    try {
      await smartCleanupTokens();
      Alert.alert('Success', 'Smart cleanup completed');
    } catch (error) {
      Alert.alert('Error', `Smart cleanup failed: ${error}`);
    }
  };

  const handleLeftoverCleanup = async () => {
    try {
      await cleanupLeftoverTokens();
      Alert.alert('Success', 'Leftover cleanup completed');
    } catch (error) {
      Alert.alert('Error', `Leftover cleanup failed: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debug Tools</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleDebugCleanup}>
        <Text style={styles.buttonText}>Delete All User Tokens</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleStatusCheck}>
        <Text style={styles.buttonText}>Check Token Status</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleSmartCleanup}>
        <Text style={styles.buttonText}>Smart Cleanup</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleLeftoverCleanup}>
        <Text style={styles.buttonText}>Cleanup Leftover Tokens</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  errorText: {
    fontSize: 10,
    color: '#F44336',
    marginTop: 4,
    flex: 1,
  },
  reconnectButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  reconnectText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});
