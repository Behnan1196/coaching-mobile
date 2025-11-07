import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

interface DateNavigationContextType {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  navigateToDaily: (date: Date) => void;
  tabNavigatorRef: React.MutableRefObject<any>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  forceNavigateToDaily: (date: Date) => void;
}

const DateNavigationContext = createContext<DateNavigationContextType | undefined>(undefined);

export const useDateNavigation = () => {
  const context = useContext(DateNavigationContext);
  if (!context) {
    throw new Error('useDateNavigation must be used within a DateNavigationProvider');
  }
  return context;
};

interface DateNavigationProviderProps {
  children: ReactNode;
}

export const DateNavigationProvider: React.FC<DateNavigationProviderProps> = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState('Daily');
  const tabNavigatorRef = useRef<any>(null);

  const navigateToDaily = useCallback((date: Date) => {
    console.log('🗓️ Navigating to daily view with date:', date.toISOString().split('T')[0]);
    setSelectedDate(date);
    
    // Navigate to Daily tab with multiple attempts
    const attemptNavigation = (attempt: number = 1) => {
      if (attempt > 5) {
        console.error('❌ Failed to navigate after 5 attempts');
        return;
      }

      if (tabNavigatorRef.current) {
        try {
          // Try different navigation methods
          if (tabNavigatorRef.current.jumpTo) {
            tabNavigatorRef.current.jumpTo('Daily');
            console.log(`✅ Successfully navigated to Daily tab (attempt ${attempt} - jumpTo)`);
          } else if (tabNavigatorRef.current.navigate) {
            tabNavigatorRef.current.navigate('Daily');
            console.log(`✅ Successfully navigated to Daily tab (attempt ${attempt} - navigate)`);
          } else {
            console.warn(`⚠️ No navigation method available (attempt ${attempt})`);
            setTimeout(() => attemptNavigation(attempt + 1), 200);
          }
        } catch (error) {
          console.error(`❌ Navigation attempt ${attempt} failed:`, error);
          setTimeout(() => attemptNavigation(attempt + 1), 200);
        }
      } else {
        console.warn(`⚠️ Tab navigator ref not available (attempt ${attempt})`);
        setTimeout(() => attemptNavigation(attempt + 1), 200);
      }
    };

    // Start navigation attempts
    setTimeout(() => attemptNavigation(), 100);
  }, []);

  const forceNavigateToDaily = useCallback((date: Date) => {
    console.log('🚀 Force navigating to daily view with date:', date.toISOString().split('T')[0]);
    setSelectedDate(date);
    setActiveTab('Daily');
    
    // Force navigation using state change
    setTimeout(() => {
      if (tabNavigatorRef.current) {
        try {
          const state = tabNavigatorRef.current.getState();
          console.log('📊 Current navigation state:', state);
          
          // Try to reset to Daily tab
          tabNavigatorRef.current.reset({
            index: 0,
            routes: [
              { name: 'Daily' },
              { name: 'Weekly' },
              { name: 'Monthly' }
            ]
          });
          console.log('✅ Successfully reset to Daily tab');
        } catch (error) {
          console.error('❌ Force navigation failed:', error);
        }
      }
    }, 50);
  }, []);

  const handleSetSelectedDate = useCallback((date: Date) => {
    console.log('📅 Setting selected date:', date.toISOString().split('T')[0]);
    setSelectedDate(date);
  }, []);

  return (
    <DateNavigationContext.Provider
      value={{
        selectedDate,
        setSelectedDate: handleSetSelectedDate,
        navigateToDaily,
        tabNavigatorRef,
        activeTab,
        setActiveTab,
        forceNavigateToDaily,
      }}
    >
      {children}
    </DateNavigationContext.Provider>
  );
};