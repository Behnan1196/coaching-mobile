import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { StreamProvider } from './src/contexts/StreamContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { StyleSheet } from 'react-native';

export default function App() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed:', appState.current, '→', nextAppState);
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🟢 App came to foreground - resuming real-time connections');
        // App came to foreground - real-time subscriptions will be re-established
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        console.log('🔴 App went to background - real-time connections may be suspended');
        // App went to background - real-time subscriptions may be suspended by the system
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthProvider>
          <StreamProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </StreamProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 