import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { DailyTab } from '../components/DailyTab';
import { WeeklyPlanTab } from '../components/WeeklyPlanTab';
import { MonthlyPlanTab } from '../components/MonthlyPlanTab';
import { DateNavigationProvider, useDateNavigation } from '../contexts/DateNavigationContext';

const MonthlyPlanScreen = () => {
  const { navigateToDaily } = useDateNavigation();

  const handleNavigateToWeek = (weekDate: Date) => {
    console.log('Navigate to week:', weekDate);
  };

  const handleNavigateToDaily = (date: Date) => {
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
  const { activeTab, setActiveTab, shouldNavigateToDaily, setShouldNavigateToDaily } = useDateNavigation();

  // Handle navigation flag - simply switch to Daily tab
  useEffect(() => {
    if (shouldNavigateToDaily) {
      setActiveTab('Daily');
      setShouldNavigateToDaily(false);
    }
  }, [shouldNavigateToDaily, setShouldNavigateToDaily, setActiveTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Daily':
        return <DailyTab />;
      case 'Weekly':
        return <WeeklyPlanTab />;
      case 'Monthly':
        return <MonthlyPlanScreen />;
      default:
        return <DailyTab />;
    }
  };

  const getTabStyle = (tabName: string) => ({
    ...styles.tab,
    backgroundColor: activeTab === tabName ? '#249096' : 'transparent',
  });

  const getTabTextStyle = (tabName: string) => ({
    ...styles.tabText,
    color: activeTab === tabName ? 'white' : '#6B7280',
    fontWeight: activeTab === tabName ? '600' : '400',
  });

  return (
    <View style={styles.container}>
      {/* Custom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={getTabStyle('Daily')}
          onPress={() => setActiveTab('Daily')}
        >
          <Text style={getTabTextStyle('Daily')}>Günlük</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={getTabStyle('Weekly')}
          onPress={() => setActiveTab('Weekly')}
        >
          <Text style={getTabTextStyle('Weekly')}>Haftalık Plan</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={getTabStyle('Monthly')}
          onPress={() => setActiveTab('Monthly')}
        >
          <Text style={getTabTextStyle('Monthly')}>Aylık Plan</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </View>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
  },
  tabText: {
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
}); 