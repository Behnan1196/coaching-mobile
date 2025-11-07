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
  const { tabNavigatorRef, activeTab, setActiveTab, navigationKey, shouldNavigateToDaily, setShouldNavigateToDaily } = useDateNavigation();

  useEffect(() => {
    console.log('📱 [STUDY_PLAN] StudyPlanContent mounted, tab navigator ref available:', !!tabNavigatorRef.current);
    console.log('🔑 [STUDY_PLAN] Navigation key changed:', navigationKey, 'Active tab:', activeTab);
  }, [navigationKey, activeTab]);

  // Handle navigation flag
  useEffect(() => {
    if (shouldNavigateToDaily && tabNavigatorRef.current) {
      console.log('🚀 [STUDY_PLAN] shouldNavigateToDaily is true, attempting navigation');
      
      const attemptNavigation = () => {
        try {
          // Try multiple navigation methods
          if (typeof tabNavigatorRef.current.jumpTo === 'function') {
            tabNavigatorRef.current.jumpTo('Daily');
            console.log('✅ [STUDY_PLAN] Successfully navigated using jumpTo');
            setShouldNavigateToDaily(false);
            setActiveTab('Daily');
            return true;
          }
          
          if (typeof tabNavigatorRef.current.navigate === 'function') {
            tabNavigatorRef.current.navigate('Daily');
            console.log('✅ [STUDY_PLAN] Successfully navigated using navigate');
            setShouldNavigateToDaily(false);
            setActiveTab('Daily');
            return true;
          }
          
          console.warn('⚠️ [STUDY_PLAN] No navigation methods available');
          return false;
        } catch (error) {
          console.error('❌ [STUDY_PLAN] Navigation failed:', error);
          return false;
        }
      };

      // Try immediately
      if (!attemptNavigation()) {
        // If immediate attempt fails, try with delays
        setTimeout(() => {
          if (attemptNavigation()) return;
          
          setTimeout(() => {
            if (attemptNavigation()) return;
            
            // Final attempt
            setTimeout(() => {
              attemptNavigation();
            }, 500);
          }, 200);
        }, 100);
      }
    }
  }, [shouldNavigateToDaily, tabNavigatorRef, setShouldNavigateToDaily, setActiveTab]);

  const handleTabNavigatorReady = () => {
    console.log('🎯 [STUDY_PLAN] Tab Navigator is ready and ref is set');
    console.log('🎯 [STUDY_PLAN] Navigator ready with activeTab:', activeTab, 'navigationKey:', navigationKey);
  };

  const handleTabChange = (state: any) => {
    if (state && state.routes && state.routes[state.index]) {
      const currentTab = state.routes[state.index].name;
      console.log('📋 [STUDY_PLAN] Tab changed to:', currentTab);
      setActiveTab(currentTab);
    }
  };



  return (
    <Tab.Navigator
      ref={(ref) => {
        tabNavigatorRef.current = ref;
        console.log('📌 [STUDY_PLAN] Tab Navigator ref set:', !!ref);
      }}
      onReady={handleTabNavigatorReady}
      onStateChange={handleTabChange}
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