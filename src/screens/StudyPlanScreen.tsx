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

  // Handle navigation flag with direct navigation
  useEffect(() => {
    if (shouldNavigateToDaily) {
      console.log('🚀 [STUDY_PLAN] shouldNavigateToDaily is true, attempting direct navigation');
      
      // Try immediate navigation if ref is available
      if (tabNavigatorRef.current) {
        console.log('🎯 [STUDY_PLAN] Tab navigator ref available, attempting jumpTo');
        try {
          tabNavigatorRef.current.jumpTo('Daily');
          console.log('✅ [STUDY_PLAN] Successfully jumped to Daily tab');
          setActiveTab('Daily');
          setShouldNavigateToDaily(false);
          return;
        } catch (error) {
          console.error('❌ [STUDY_PLAN] jumpTo failed:', error);
        }
      }
      
      // Fallback: Force re-render with Daily as initial
      console.log('🔄 [STUDY_PLAN] Fallback: forcing navigator re-render');
      setActiveTab('Daily');
      setNavigatorKey(prev => prev + 1);
      setShouldNavigateToDaily(false);
    }
  }, [shouldNavigateToDaily, setShouldNavigateToDaily, setActiveTab, tabNavigatorRef]);

  const handleTabNavigatorReady = () => {
    console.log('🎯 [STUDY_PLAN] Tab Navigator is ready and ref is set');
    console.log('🎯 [STUDY_PLAN] Navigator ready with activeTab:', activeTab, 'navigationKey:', navigationKey);
    
    // If we have a pending navigation, try it now
    if (shouldNavigateToDaily) {
      console.log('🚀 [STUDY_PLAN] Navigator ready and shouldNavigateToDaily is true, attempting navigation');
      setTimeout(() => {
        try {
          if (tabNavigatorRef.current?.jumpTo) {
            tabNavigatorRef.current.jumpTo('Daily');
            console.log('✅ [STUDY_PLAN] Successfully navigated to Daily on ready');
            setActiveTab('Daily');
            setShouldNavigateToDaily(false);
          }
        } catch (error) {
          console.error('❌ [STUDY_PLAN] Navigation on ready failed:', error);
        }
      }, 100);
    }
  };

  const handleTabChange = (state: any) => {
    if (state && state.routes && state.routes[state.index]) {
      const currentTab = state.routes[state.index].name;
      console.log('📋 [STUDY_PLAN] Tab changed to:', currentTab, 'Index:', state.index);
      setActiveTab(currentTab);
      setCurrentTabIndex(state.index);
    }
  };



  // Create navigation state based on activeTab
  const getNavigationState = () => {
    const routes = [
      { key: 'Daily', name: 'Daily' },
      { key: 'Weekly', name: 'Weekly' },
      { key: 'Monthly', name: 'Monthly' }
    ];
    
    let index = 0;
    if (activeTab === 'Weekly') index = 1;
    else if (activeTab === 'Monthly') index = 2;
    
    console.log('📊 [STUDY_PLAN] Creating navigation state with index:', index, 'for activeTab:', activeTab);
    
    return {
      index,
      routes
    };
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
      tabBarPosition="top"
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