import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { StreamProvider } from './src/contexts/StreamContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { StyleSheet } from 'react-native';
import NotificationService from './src/lib/notifications';

export default function App() {
  useEffect(() => {
    NotificationService.setupNotificationListeners();
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
