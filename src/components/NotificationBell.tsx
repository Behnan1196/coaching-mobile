import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStreamChatContext } from '../contexts/StreamContext';

interface NotificationBellProps {
  onPress?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onPress }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { chatClient } = useStreamChatContext();

  useEffect(() => {
    if (!chatClient) return;

    const handleUnreadCountChanged = () => {
      // Get total unread count across all channels
      const totalUnread = chatClient.user?.total_unread_count || 0;
      setUnreadCount(totalUnread);
    };

    // Listen for unread count changes
    chatClient.on('notification.message_new', handleUnreadCountChanged);
    chatClient.on('notification.mark_read', handleUnreadCountChanged);
    chatClient.on('user.updated', handleUnreadCountChanged);

    // Initial count
    handleUnreadCountChanged();

    return () => {
      chatClient.off('notification.message_new', handleUnreadCountChanged);
      chatClient.off('notification.mark_read', handleUnreadCountChanged);
      chatClient.off('user.updated', handleUnreadCountChanged);
    };
  }, [chatClient]);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Ionicons 
        name={unreadCount > 0 ? "notifications" : "notifications-outline"} 
        size={24} 
        color={unreadCount > 0 ? "#FF6B6B" : "#666"} 
      />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
