import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

interface NotificationBellProps {
  size?: number;
  color?: string;
}

export function NotificationBell({ size = 24, color = '#6B7280' }: NotificationBellProps) {
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    if (!session?.user) return;

    try {
      setIsLoading(true);
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ozgun-v15.vercel.app';
      const response = await fetch(`${apiUrl}/api/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch count on mount and when user changes
  useEffect(() => {
    fetchUnreadCount();
  }, [session?.user]);

  // Poll for updates every 30 seconds
  useEffect(() => {
    if (!session?.user) return;

    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [session?.user]);

  if (!session?.user) return null;

  const bellIconName = unreadCount > 0 ? 'notifications' : 'notifications-outline';
  const bellColor = unreadCount > 0 ? '#3B82F6' : color;

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={fetchUnreadCount}
      disabled={isLoading}
    >
      <View style={styles.bellContainer}>
        <Ionicons 
          name={bellIconName} 
          size={size} 
          color={bellColor}
        />
        
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}
        
        {isLoading && (
          <View style={styles.loadingIndicator}>
            <View style={styles.spinner} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
  bellContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
  },
  spinner: {
    width: 12,
    height: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderTopColor: 'transparent',
    borderRadius: 6,
    // Note: You'd need to add animation here using Animated API
  },
});

export default NotificationBell;