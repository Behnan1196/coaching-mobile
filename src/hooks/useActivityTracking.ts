import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/stream';

// Activity tracking hook for chat channels
interface UseActivityTrackingProps {
  channelId: string | null;
  isEnabled: boolean;
  apiUrl?: string;
}

export function useActivityTracking({ channelId, isEnabled, apiUrl }: UseActivityTrackingProps) {
  const triggerActivity = async () => {
    if (!isEnabled || !channelId || !apiUrl) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/notifications/user-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId,
          activityType: 'chat_interaction',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.warn('Failed to track activity:', response.status);
      }
    } catch (error) {
      console.warn('Error tracking activity:', error);
    }
  };

  return { triggerActivity };
}

interface UseRealTimeSubscriptionOptions {
  channelName: string;
  table: string;
  filter?: string;
  onUpdate?: (payload: any) => void;
  onInsert?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  enabled?: boolean;
  userId?: string;
}

export const useRealTimeSubscription = ({
  channelName,
  table,
  filter,
  onUpdate,
  onInsert,
  onDelete,
  enabled = true,
  userId
}: UseRealTimeSubscriptionOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  const createSubscription = () => {
    if (!enabled || !supabase || !userId) return null;

    try {
      console.log(`📡 [${channelName}] Creating real-time subscription for table: ${table}`);
      
      const subscription = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: userId }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: filter
          },
          (payload) => {
            console.log(`📡 [${channelName}] Real-time update received:`, payload.eventType);
            
            try {
              if (payload.eventType === 'UPDATE' && onUpdate) {
                onUpdate(payload);
              } else if (payload.eventType === 'INSERT' && onInsert) {
                onInsert(payload);
              } else if (payload.eventType === 'DELETE' && onDelete) {
                onDelete(payload);
              }
            } catch (error) {
              console.error(`❌ [${channelName}] Error processing payload:`, error);
            }
          }
        )
        .subscribe((status) => {
          console.log(`📊 [${channelName}] Subscription status:`, status);
          
          if (status === 'SUBSCRIBED') {
            console.log(`✅ [${channelName}] Real-time subscription active`);
            setIsConnected(true);
            setLastError(null);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ [${channelName}] Real-time subscription error`);
            setIsConnected(false);
            setLastError('Channel error occurred');
            scheduleReconnect();
          } else if (status === 'TIMED_OUT') {
            console.warn(`⏰ [${channelName}] Real-time subscription timed out`);
            setIsConnected(false);
            setLastError('Subscription timed out');
            scheduleReconnect();
          } else if (status === 'CLOSED') {
            console.warn(`🔒 [${channelName}] Real-time subscription closed`);
            setIsConnected(false);
            setLastError('Subscription closed');
            // Don't auto-reconnect for closed status as it's usually intentional
          }
        });

      return subscription;
    } catch (error) {
      console.error(`❌ [${channelName}] Failed to create subscription:`, error);
      setLastError(`Failed to create subscription: ${error}`);
      return null;
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    console.log(`🔄 [${channelName}] Scheduling reconnection in 5 seconds...`);
    reconnectTimeoutRef.current = setTimeout(() => {
      if (appState.current === 'active') {
        console.log(`🔄 [${channelName}] Attempting to reconnect...`);
        cleanupSubscription();
        const newSubscription = createSubscription();
        if (newSubscription) {
          subscriptionRef.current = newSubscription;
        }
      }
    }, 5000);
  };

  const cleanupSubscription = () => {
    if (subscriptionRef.current && supabase) {
      try {
        console.log(`🧹 [${channelName}] Cleaning up subscription`);
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsConnected(false);
      } catch (error) {
        console.error(`❌ [${channelName}] Error cleaning up subscription:`, error);
      }
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`📱 [${channelName}] App state changed:`, appState.current, '→', nextAppState);
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log(`🟢 [${channelName}] App came to foreground - checking subscription status`);
        // App came to foreground - check if subscription is still active
        if (!isConnected && enabled) {
          console.log(`🔄 [${channelName}] Reconnecting after foreground transition`);
          const newSubscription = createSubscription();
          if (newSubscription) {
            subscriptionRef.current = newSubscription;
          }
        }
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        console.log(`🔴 [${channelName}] App went to background - subscription may be suspended`);
        // App went to background - real-time subscriptions may be suspended by the system
        // We'll handle reconnection when the app comes back to foreground
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [channelName, isConnected, enabled]);

  // Create subscription when enabled or userId changes
  useEffect(() => {
    if (enabled && userId) {
      const subscription = createSubscription();
      if (subscription) {
        subscriptionRef.current = subscription;
      }
    }

    return cleanupSubscription;
  }, [enabled, userId, table, filter]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanupSubscription;
  }, []);

  return {
    isConnected,
    lastError,
    reconnect: () => {
      cleanupSubscription();
      const newSubscription = createSubscription();
      if (newSubscription) {
        subscriptionRef.current = newSubscription;
      }
    }
  };
};
