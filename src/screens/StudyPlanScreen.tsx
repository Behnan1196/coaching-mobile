import React, { useEffect, useState } from 'react';
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
  const { tabNavigatorRef, activeTab, setActiveTab, navigationKey, shouldNavigateToDaily, setShouldNavigateToDaily } = useDateNavigation();
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [navigatorKey, setNavigatorKey] = useState(0);

  useEffect(() => {
    console.log('📱 [STUDY_PLAN] StudyPlanContent mounted, tab navigator ref available:', !!tabNavigatorRef.current);
    console.log('🔑 [STUDY_PLAN] Navigation key changed:', navigationKey, 'Active tab:', activeTab);
  }, [navigationKey, activeTab]);

  // Handle navigation flag with forced re-render
  useEffect(() => {
    if (shouldNavigateToDaily) {
      console.log('🚀 [STUDY_PLAN] shouldNavigateToDaily is true, forcing navigator re-render with Daily as initial');
      setActiveTab('Daily');
      setNavigatorKey(prev => prev + 1); // Force complete re-render
      setShouldNavigateToDaily(false);
    }
  }, [shouldNavigateToDaily, setShouldNavigateToDaily, setActiveTab]);

  const handleTabNavigatorReady = () => {
    console.log('🎯 [STUDY_PLAN] Tab Navigator is ready and ref is set');
    console.log('🎯 [STUDY_PLAN] Navigator ready with activeTab:', activeTab, 'navigationKey:', navigationKey);
  };

  const handleTabChange = (state: any) => {
    if (state && state.routes && state.routes[state.index]) {
      const currentTab = state.routes[state.index].name;
      console.log('📋 [STUDY_PLAN] Tab changed to:', currentTab, 'Index:', state.index);
      setActiveTab(currentTab);
      setCurrentTabIndex(state.index);
    }
  };



  return (
    <Tab.Navigator
      key={`navigator-${navigatorKey}`} // Force complete re-render
      ref={(ref) => {
        tabNavigatorRef.current = ref;
        console.log('📌 [STUDY_PLAN] Tab Navigator ref set:', !!ref, 'Key:', navigatorKey, 'ActiveTab:', activeTab);
      }}
      onReady={handleTabNavigatorReady}
      onStateChange={handleTabChange}
      initialRouteName={activeTab} // Use activeTab as initial route
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
      <Tab.Screen 
        name="Daily" 
        component={DailyScreen} 
        options={{ title: 'Günlük' }}
        listeners={{
          focus: () => {
            console.log('🎯 [STUDY_PLAN] Daily tab focused');
            setActiveTab('Daily');
          }
        }}
      />
      <Tab.Screen 
        name="Weekly" 
        component={WeeklyPlanScreen} 
        options={{ title: 'Haftalık Plan' }}
        listeners={{
          focus: () => {
            console.log('🎯 [STUDY_PLAN] Weekly tab focused');
            setActiveTab('Weekly');
          }
        }}
      />
      <Tab.Screen 
        name="Monthly" 
        component={MonthlyPlanScreen} 
        options={{ title: 'Aylık Plan' }}
        listeners={{
          focus: () => {
            console.log('🎯 [STUDY_PLAN] Monthly tab focused');
            setActiveTab('Monthly');
          }
        }}
      />
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