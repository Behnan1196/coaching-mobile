import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

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
    if (!channelId || !isEnabled) return;

    try {
      const response = await fetch(`${apiUrl}/api/notifications/user-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId,
          isActive,
          platform: 'ios' // You could detect platform dynamically
        }),
      });

      if (response.ok) {
        console.log(`🔄 Activity tracking: ${isActive ? 'started' : 'stopped'} for channel ${channelId}`);
      } else {
        console.error('Failed to update activity:', response.status);
      }
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  }, [channelId, isEnabled, apiUrl]);

  const startActivity = useCallback(() => {
    if (!isActiveRef.current) {
      isActiveRef.current = true;
      updateActivity(true);
    }
  }, [updateActivity]);

  const stopActivity = useCallback(() => {
    if (isActiveRef.current) {
      isActiveRef.current = false;
      updateActivity(false);
    }
  }, [updateActivity]);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Stop activity after 30 seconds of inactivity
    timeoutRef.current = setTimeout(() => {
      stopActivity();
    }, 30000);
  }, [stopActivity]);

  // Track app state changes
  useEffect(() => {
    if (!channelId || !isEnabled) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        console.log('📱 App came to foreground');
        startActivity();
        resetTimeout();
      } else if (nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        console.log('📱 App went to background');
        stopActivity();
      }
      
      appStateRef.current = nextAppState;
    };

    // Start tracking when component mounts (if app is active)
    if (AppState.currentState === 'active') {
      startActivity();
      resetTimeout();
    }

    // Add app state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Cleanup
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
