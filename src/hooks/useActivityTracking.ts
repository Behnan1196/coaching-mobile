import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

interface UseActivityTrackingProps {
  channelId: string | null;
  isEnabled: boolean;
  apiUrl: string;
}

export function useActivityTracking({ channelId, isEnabled, apiUrl }: UseActivityTrackingProps) {
  const isActiveRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateActivity = useCallback(async (isActive: boolean) => {
    if (!channelId || !isEnabled) {
      console.log(`🚫 Activity tracking skipped: channelId=${channelId}, isEnabled=${isEnabled}`);
      return;
    }

    try {
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ No active session for activity tracking:', sessionError);
        return;
      }

      const platform = Platform.OS; // Detect actual platform (ios/android)
      const requestBody = {
        channelId,
        isActive,
        platform
      };
      
      console.log(`📱 MOBILE ACTIVITY: ${isActive ? 'ACTIVE' : 'INACTIVE'} in channel ${channelId} (${platform})`);
      
      // Add timeout and better error handling for network requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${apiUrl}/api/notifications/user-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.text();
        console.log(`✅ Mobile activity tracking: ${isActive ? 'started' : 'stopped'} for channel ${channelId} - Response: ${result}`);
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to update mobile activity: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      // More specific error handling
      if (error.name === 'AbortError') {
        console.warn('⚠️ Activity tracking request timed out - this is normal during app state transitions');
      } else if (error.message?.includes('Network request failed')) {
        console.warn('⚠️ Network unavailable for activity tracking - will retry when connection is restored');
      } else {
        console.error('❌ Error updating mobile activity:', error);
      }
    }
  }, [channelId, isEnabled, apiUrl]);

  const startActivity = useCallback(() => {
    if (!isActiveRef.current) {
      console.log(`🟢 Starting mobile activity tracking for channel: ${channelId}`);
      isActiveRef.current = true;
      updateActivity(true);
    } else {
      console.log(`⚠️ Activity already active for channel: ${channelId}`);
    }
  }, [updateActivity, channelId]);

  const stopActivity = useCallback(() => {
    if (isActiveRef.current) {
      console.log(`🔴 Stopping mobile activity tracking for channel: ${channelId}`);
      isActiveRef.current = false;
      updateActivity(false);
    } else {
      console.log(`⚠️ Activity already inactive for channel: ${channelId}`);
    }
  }, [updateActivity, channelId]);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Stop activity after 60 seconds of inactivity (more forgiving)
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ Activity timeout reached - stopping activity tracking');
      stopActivity();
    }, 60000);
  }, [stopActivity]);

  // Track app state changes
  useEffect(() => {
    if (!channelId || !isEnabled) {
      console.log(`🚫 Activity tracking disabled: channelId=${channelId}, isEnabled=${isEnabled}`);
      return;
    }

    console.log(`🎯 Initializing mobile activity tracking for channel: ${channelId}`);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`📱 App state changed: ${appStateRef.current} → ${nextAppState}`);
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground - add small delay to let network stabilize
        console.log('📱 App came to foreground - starting activity (with delay)');
        setTimeout(() => {
          startActivity();
          resetTimeout();
        }, 1000); // 1 second delay
      } else if (nextAppState === 'background') {
        // App has gone to the background (not just inactive)
        console.log('📱 App went to background - stopping activity');
        stopActivity();
      } else if (nextAppState === 'inactive') {
        // App is inactive but not background - keep activity tracking active
        console.log('📱 App went inactive - keeping activity tracking active');
        // Don't stop activity for inactive state
      }
      
      appStateRef.current = nextAppState;
    };

    // Start tracking when component mounts (if app is active)
    if (AppState.currentState === 'active') {
      console.log('📱 App is active on mount - starting activity tracking');
      startActivity();
      resetTimeout();
    }

    // Add app state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Cleanup
      console.log(`🧹 Cleaning up activity tracking for channel: ${channelId}`);
      stopActivity();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      subscription?.remove();
    };
  }, [channelId, isEnabled, startActivity, stopActivity, resetTimeout]);

  // Stop activity when channel changes
  useEffect(() => {
    return () => {
      if (isActiveRef.current) {
        stopActivity();
      }
    };
  }, [channelId, stopActivity]);

  // Manual activity trigger (for user interactions)
  const triggerActivity = useCallback(() => {
    if (AppState.currentState === 'active') {
      startActivity();
      resetTimeout();
    }
  }, [startActivity, resetTimeout]);

  return {
    startActivity,
    stopActivity,
    triggerActivity,
    isActive: isActiveRef.current
  };
}
