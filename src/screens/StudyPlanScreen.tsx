import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { DailyTab } from '../components/DailyTab';
import { WeeklyPlanTab } from '../components/WeeklyPlanTab';
import { MonthlyPlanTab } from '../components/MonthlyPlanTab';
import { DateNavigationProvider, useDateNavigation } from '../contexts/DateNavigationContext';

const Tab = createMaterialTopTabNavigator();

const DailyScreen = () => <DailyTab />;

const WeeklyPlanScreen = () => <WeeklyPlanTab />;

const MonthlyPlanScreen = () => {
  const { navigateToDaily, forceNavigateToDaily } = useDateNavigation();

  const handleNavigateToWeek = (weekDate: Date) => {
    // This would navigate to the weekly tab with the specific week
    // For now, we'll just log it
    console.log('Navigate to week:', weekDate);
  };

  const handleNavigateToDaily = (date: Date) => {
    console.log('🗓️ MonthlyPlanScreen: Navigating to daily for date:', date.toISOString().split('T')[0]);
    
    // Try both methods - first the regular one, then force if needed
    navigateToDaily(date);
    
    // Also try force navigation as backup
    setTimeout(() => {
      console.log('🚀 Attempting force navigation as backup');
      forceNavigateToDaily(date);
    }, 300);
  };

  return (
    <MonthlyPlanTab 
      onNavigateToWeek={handleNavigateToWeek}
      onNavigateToDaily={handleNavigateToDaily}
    />
  );
};

const StudyPlanContent: React.FC = () => {
  const { tabNavigatorRef, activeTab, setActiveTab } = useDateNavigation();

  useEffect(() => {
    console.log('📱 StudyPlanContent mounted, tab navigator ref available:', !!tabNavigatorRef.current);
  }, []);

  const handleTabNavigatorReady = () => {
    console.log('🎯 Tab Navigator is ready and ref is set');
  };

  const handleTabChange = (state: any) => {
    const currentTab = state.routes[state.index].name;
    console.log('📋 Tab changed to:', currentTab);
    setActiveTab(currentTab);
  };

  return (
    <Tab.Navigator
      ref={(ref) => {
        tabNavigatorRef.current = ref;
        console.log('📌 Tab Navigator ref set:', !!ref);
      }}
      onReady={handleTabNavigatorReady}
      onStateChange={handleTabChange}
      initialRouteName={activeTab}
      screenOptions={{
        tabBarActiveTintColor: '#249096',
        tabBarInactiveTintColor: '#6B7280',
        tabBarIndicatorStyle: {
          backgroundColor: '#249096',
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
      <Tab.Screen name="Daily" component={DailyScreen} options={{ title: 'Günlük' }} />
      <Tab.Screen name="Weekly" component={WeeklyPlanScreen} options={{ title: 'Haftalık Plan' }} />
      <Tab.Screen name="Monthly" component={MonthlyPlanScreen} options={{ title: 'Aylık Plan' }} />
    </Tab.Navigator>
  );
};

export const StudyPlanScreen: React.FC = () => {
  return (
    <DateNavigationProvider>
      <View style={styles.container}>
        <StudyPlanContent />
      </View>
    </DateNavigationProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
}); 