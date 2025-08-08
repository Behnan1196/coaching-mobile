import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { CoachStudentProvider, useCoachStudent } from '../contexts/CoachStudentContext';
import { useStream } from '../contexts/StreamContext';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { StudyPlanScreen } from '../screens/StudyPlanScreen';
import { ChatTabScreen } from '../screens/ChatTabScreen';
import { StatisticsScreen } from '../screens/StatisticsScreen';
import { ToolsScreen } from '../screens/ToolsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { StudentSelectionHeader } from '../components/StudentSelectionHeader';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const MainTabs: React.FC = () => {
  return (
    <SafeAreaView style={styles.tabContainer} edges={['top', 'bottom']}>
      <StudentSelectionHeader />
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
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="StudyPlan"
          component={StudyPlanScreen}
          options={{
            title: 'Çalışma Planı',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Chat"
          component={ChatTabScreen}
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Statistics"
          component={StatisticsScreen}
          options={{
            title: 'Gelişimim',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Tools"
          component={ToolsScreen}
          options={{
            title: 'Araçlar',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="construct" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { userProfile } = useAuth();
  const { videoCall } = useStream();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Auto-navigate to Chat tab when a call becomes active
  useEffect(() => {
    if (videoCall && navigationRef.current) {
      console.log('🎯 [NAVIGATOR] Active call detected, navigating to Chat tab');
      navigationRef.current.navigate('Chat' as never);
    }
  }, [videoCall]);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
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
  tabContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
}); 