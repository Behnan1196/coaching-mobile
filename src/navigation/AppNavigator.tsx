import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { CoachStudentProvider, useCoachStudent } from '../contexts/CoachStudentContext';
import { useStream } from '../contexts/StreamContext';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { VideoCallTabScreen } from '../screens/VideoCallTabScreen';
import { CoachStudentSelectionScreen } from '../screens/CoachStudentSelectionScreen';

const Tab = createBottomTabNavigator();

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIcon}>
              <View style={[styles.homeIcon, { backgroundColor: color }]} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Mesaj',
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIcon}>
              <View style={[styles.chatIcon, { backgroundColor: color }]} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="VideoCall"
        component={VideoCallTabScreen}
        options={{
          title: 'Video',
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIcon}>
              <View style={[styles.videoIcon, { backgroundColor: color }]} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { userProfile } = useAuth();
  const { videoCall } = useStream();
  const [studentSelected, setStudentSelected] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Debug: Log student selection state
  useEffect(() => {
    console.log('🎯 [NAVIGATOR] Student selected state:', studentSelected);
  }, [studentSelected]);

  // Auto-navigate to VideoCall tab when a call becomes active
  useEffect(() => {
    if (videoCall && navigationRef.current) {
      console.log('🎯 [NAVIGATOR] Active call detected, navigating to VideoCall tab');
      navigationRef.current.navigate('VideoCall' as never);
    }
  }, [videoCall]);

  // Show main content based on user role
  const renderMainContent = () => {
    // For students, go directly to main tabs
    if (userProfile?.role === 'student') {
      return (
        <NavigationContainer ref={navigationRef}>
          <MainTabs />
        </NavigationContainer>
      );
    }

    // For coaches, check if a student is selected
    if (userProfile?.role === 'coach') {
      if (!studentSelected) {
        return (
          <CoachStudentSelectionScreen
            onStudentSelected={() => {
              console.log('🎯 [NAVIGATOR] onStudentSelected callback triggered');
              setStudentSelected(true);
              console.log('🎯 [NAVIGATOR] Student selected state set to true');
            }}
          />
        );
      }

      return (
        <NavigationContainer ref={navigationRef}>
          <MainTabs />
        </NavigationContainer>
      );
    }

    // For other roles or undefined role, show main tabs
    return (
      <NavigationContainer ref={navigationRef}>
        <MainTabs />
      </NavigationContainer>
    );
  };

  return renderMainContent();
};

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <CoachStudentProvider>
      <AuthenticatedApp />
    </CoachStudentProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  homeIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  chatIcon: {
    width: 20,
    height: 16,
    borderRadius: 8,
  },
  videoIcon: {
    width: 20,
    height: 14,
    borderRadius: 2,
  },
}); 