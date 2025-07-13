import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

const Tab = createMaterialTopTabNavigator();

const TodayScreen = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabTitle}>Today's Plan</Text>
    <Text style={styles.placeholder}>Today's study plan content will go here</Text>
  </View>
);

const WeeklyPlanScreen = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabTitle}>Weekly Plan</Text>
    <Text style={styles.placeholder}>Weekly study plan content will go here</Text>
  </View>
);

const MonthlyPlanScreen = () => (
  <View style={styles.tabContent}>
    <Text style={styles.tabTitle}>Monthly Plan</Text>
    <Text style={styles.placeholder}>Monthly study plan content will go here</Text>
  </View>
);

export const StudyPlanScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Study Plan</Text>
      </View>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#6B7280',
          tabBarIndicatorStyle: {
            backgroundColor: '#3B82F6',
          },
          tabBarLabelStyle: {
            fontSize: 14,
            fontWeight: '600',
          },
          tabBarStyle: {
            backgroundColor: 'white',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          },
        }}
      >
        <Tab.Screen name="Today" component={TodayScreen} options={{ title: 'Today' }} />
        <Tab.Screen name="Weekly" component={WeeklyPlanScreen} options={{ title: 'Weekly Plan' }} />
        <Tab.Screen name="Monthly" component={MonthlyPlanScreen} options={{ title: 'Monthly Plan' }} />
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