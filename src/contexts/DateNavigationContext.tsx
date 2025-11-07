import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

interface DateNavigationContextType {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  navigateToDaily: (date: Date) => void;
  tabNavigatorRef: React.MutableRefObject<any>;
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
  const tabNavigatorRef = useRef<any>(null);

  const navigateToDaily = useCallback((date: Date) => {
    console.log('🗓️ Navigating to daily view with date:', date.toISOString().split('T')[0]);
    setSelectedDate(date);
    
    // Navigate to Daily tab with a small delay to ensure ref is available
    setTimeout(() => {
      if (tabNavigatorRef.current) {
        try {
          // Use jumpTo instead of navigate for tab navigation
          tabNavigatorRef.current.jumpTo('Daily');
          console.log('✅ Successfully navigated to Daily tab');
        } catch (error) {
          console.error('❌ Error navigating to Daily tab:', error);
          // Fallback to navigate method
          try {
            tabNavigatorRef.current.navigate('Daily');
            console.log('✅ Successfully navigated to Daily tab (fallback)');
          } catch (fallbackError) {
            console.error('❌ Fallback navigation also failed:', fallbackError);
          }
        }
      } else {
        console.warn('⚠️ Tab navigator ref is not available after timeout');
      }
    }, 100);
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
      }}
    >
      {children}
    </DateNavigationContext.Provider>
  );
};