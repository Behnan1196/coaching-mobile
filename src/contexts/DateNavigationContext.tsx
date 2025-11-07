import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

interface DateNavigationContextType {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  navigateToDaily: (date: Date) => void;
  tabNavigatorRef: React.MutableRefObject<any>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  forceNavigateToDaily: (date: Date) => void;
  navigationKey: number;
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
  const [navigationKey, setNavigationKey] = useState(0);
  const tabNavigatorRef = useRef<any>(null);

  const navigateToDaily = useCallback((date: Date) => {
    console.log('🗓️ Navigating to daily view with date:', date.toISOString().split('T')[0]);
    setSelectedDate(date);
    setActiveTab('Daily');
    
    // Force re-render of navigator with Daily as active tab
    setNavigationKey(prev => prev + 1);
    
    // Also try programmatic navigation as backup
    setTimeout(() => {
      if (tabNavigatorRef.current) {
        try {
          console.log('🎯 Attempting programmatic navigation to Daily tab');
          
          // Get current state
          const state = tabNavigatorRef.current.getState?.();
          console.log('📊 Current tab state:', state);
          
          // Try jumpTo first (most reliable for tab navigation)
          if (typeof tabNavigatorRef.current.jumpTo === 'function') {
            tabNavigatorRef.current.jumpTo('Daily');
            console.log('✅ Successfully used jumpTo method');
            return;
          }
          
          // Fallback to navigate
          if (typeof tabNavigatorRef.current.navigate === 'function') {
            tabNavigatorRef.current.navigate('Daily');
            console.log('✅ Successfully used navigate method');
            return;
          }
          
          console.warn('⚠️ No suitable navigation method found');
        } catch (error) {
          console.error('❌ Navigation failed:', error);
        }
      } else {
        console.warn('⚠️ Tab navigator ref not available');
      }
    }, 150);
  }, []);

  const forceNavigateToDaily = useCallback((date: Date) => {
    console.log('🚀 Force navigating to daily view with date:', date.toISOString().split('T')[0]);
    setSelectedDate(date);
    setActiveTab('Daily');
    setNavigationKey(prev => prev + 1);
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
        navigationKey,
      }}
    >
      {children}
    </DateNavigationContext.Provider>
  );
};