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
    navigateToDaily(date);
  };

  return (
    <MonthlyPlanTab 
      onNavigateToWeek={handleNavigateToWeek}
      onNavigateToDaily={handleNavigateToDaily}
    />
  );
};

const StudyPlanContent: React.FC = () => {
  const { tabNavigatorRef, activeTab, setActiveTab, navigationKey } = useDateNavigation();

  useEffect(() => {
    console.log('📱 StudyPlanContent mounted, tab navigator ref available:', !!tabNavigatorRef.current);
    console.log('🔑 Navigation key changed:', navigationKey, 'Active tab:', activeTab);
  }, [navigationKey, activeTab]);

  const handleTabNavigatorReady = () => {
    console.log('🎯 Tab Navigator is ready and ref is set');
  };

  const handleTabChange = (state: any) => {
    if (state && state.routes && state.routes[state.index]) {
      const currentTab = state.routes[state.index].name;
      console.log('📋 Tab changed to:', currentTab);
      setActiveTab(currentTab);
    }
  };

  // Force initial route based on activeTab
  const getInitialRouteName = () => {
    console.log('🎯 Setting initial route to:', activeTab);
    return activeTab;
  };

  return (
    <Tab.Navigator
      key={`tab-navigator-${navigationKey}`} // Force re-render when navigationKey changes
      ref={(ref) => {
        tabNavigatorRef.current = ref;
        console.log('📌 Tab Navigator ref set:', !!ref, 'Key:', navigationKey);
      }}
      onReady={handleTabNavigatorReady}
      onStateChange={handleTabChange}
      initialRouteName={getInitialRouteName()}
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