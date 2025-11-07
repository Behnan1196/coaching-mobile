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
  shouldNavigateToDaily: boolean;
  setShouldNavigateToDaily: (should: boolean) => void;
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
  const [shouldNavigateToDaily, setShouldNavigateToDaily] = useState(false);
  const tabNavigatorRef = useRef<any>(null);

  const navigateToDaily = useCallback((date: Date) => {
    console.log('🗓️ [CONTEXT] Navigating to daily view with date:', date.toISOString().split('T')[0]);
    
    // Set the date and trigger navigation flag
    setSelectedDate(date);
    setShouldNavigateToDaily(true);
    
    console.log('🗓️ [CONTEXT] Set shouldNavigateToDaily to true');
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
        shouldNavigateToDaily,
        setShouldNavigateToDaily,
      }}
    >
      {children}
    </DateNavigationContext.Provider>
  );
};