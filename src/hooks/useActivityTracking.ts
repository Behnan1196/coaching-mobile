import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../lib/supabase';

// Activity tracking hook for chat channels
interface UseActivityTrackingProps {
  userId: string | null;
  currentScreen: string;
  isEnabled: boolean;
}

export function useActivityTracking({ userId, currentScreen, isEnabled }: UseActivityTrackingProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isEnabled || !userId || !supabase) {
      return;
    }

    // Update activity immediately
    const updateActivity = async () => {
      try {
        console.log('📊 Updating activity:', { userId, currentScreen });
        const { error } = await supabase
          .from('user_activity')
          .upsert({
            user_id: userId,
            current_screen: currentScreen,
            last_activity_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.warn('❌ Failed to update activity:', error);
        } else {
          console.log('✅ Activity updated successfully');
        }
      } catch (error) {
        console.warn('❌ Error updating activity:', error);
      }
    };

    // Update immediately
    updateActivity();

    // Update every 10 seconds while on this screen
    intervalRef.current = setInterval(updateActivity, 10000);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Clear current screen when leaving
      if (supabase) {
        supabase
          .from('user_activity')
          .update({
            current_screen: null,
            last_activity_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .then(() => {
            console.log('Cleared current screen on unmount');
          })
          .catch((error) => {
            console.warn('Error clearing screen:', error);
          });
      }
    };
  }, [userId, currentScreen, isEnabled]);

  return {};
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
