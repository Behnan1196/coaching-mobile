import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

const Tab = createMaterialTopTabNavigator();

const MyProfileScreen = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabTitle}>My Profile</Text>
    <Text style={styles.placeholder}>Profile settings and information will go here</Text>
  </View>
);

const MockExamsScreen = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabTitle}>Mock Exams</Text>
    <Text style={styles.placeholder}>Mock exam content will go here</Text>
  </View>
);

const UsefulLinksScreen = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabTitle}>Useful Links</Text>
    <Text style={styles.placeholder}>Useful links and resources will go here</Text>
  </View>
);

const PomodoroTimerScreen = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabTitle}>Pomodoro Timer</Text>
    <Text style={styles.placeholder}>Pomodoro timer will go here</Text>
  </View>
);

export const ToolsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tools</Text>
      </View>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#6B7280',
          tabBarIndicatorStyle: {
            backgroundColor: '#3B82F6',
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          tabBarStyle: {
            backgroundColor: 'white',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          },
          tabBarScrollEnabled: true,
        }}
      >
        <Tab.Screen name="Profile" component={MyProfileScreen} options={{ title: 'My Profile' }} />
        <Tab.Screen name="MockExams" component={MockExamsScreen} options={{ title: 'Mock Exams' }} />
        <Tab.Screen name="Links" component={UsefulLinksScreen} options={{ title: 'Useful Links' }} />
        <Tab.Screen name="Pomodoro" component={PomodoroTimerScreen} options={{ title: 'Pomodoro' }} />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  placeholder: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
}); 