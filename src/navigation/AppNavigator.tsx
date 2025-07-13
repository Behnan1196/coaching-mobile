import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
          title: 'Study Plan',
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
          title: 'Statistics',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tools"
        component={ToolsScreen}
        options={{
          title: 'Tools',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct" size={size} color={color} />
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

  // Auto-navigate to Chat tab when a call becomes active
  useEffect(() => {
    if (videoCall && navigationRef.current) {
      console.log('🎯 [NAVIGATOR] Active call detected, navigating to Chat tab');
      navigationRef.current.navigate('Chat' as never);
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
}); 