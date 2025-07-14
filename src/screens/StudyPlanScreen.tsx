import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { TodayTab } from '../components/TodayTab';
import { WeeklyPlanTab } from '../components/WeeklyPlanTab';
import { MonthlyPlanTab } from '../components/MonthlyPlanTab';

const Tab = createMaterialTopTabNavigator();

const TodayScreen = () => <TodayTab />;

const WeeklyPlanScreen = () => <WeeklyPlanTab />;

const MonthlyPlanScreen = () => {
  const handleNavigateToWeek = (weekDate: Date) => {
    // This would navigate to the weekly tab with the specific week
    // For now, we'll just log it
    console.log('Navigate to week:', weekDate);
  };

  return <MonthlyPlanTab onNavigateToWeek={handleNavigateToWeek} />;
};

export const StudyPlanScreen: React.FC = () => {
  return (
    <View style={styles.container}>
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
        <Tab.Screen name="Today" component={TodayScreen} options={{ title: 'Bugün' }} />
        <Tab.Screen name="Weekly" component={WeeklyPlanScreen} options={{ title: 'Haftalık Plan' }} />
        <Tab.Screen name="Monthly" component={MonthlyPlanScreen} options={{ title: 'Aylık Plan' }} />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
}); 