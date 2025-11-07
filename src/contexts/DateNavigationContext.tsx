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
    console.log('🗓️ [CONTEXT] Navigating to daily view with date:', date.toISOString().split('T')[0]);
    console.log('🗓️ [CONTEXT] Current activeTab before change:', activeTab);
    
    setSelectedDate(date);
    setActiveTab('Daily');
    
    console.log('🗓️ [CONTEXT] Set activeTab to Daily, incrementing navigationKey');
    
    // Force re-render of navigator with Daily as active tab
    setNavigationKey(prev => {
      const newKey = prev + 1;
      console.log('🔑 [CONTEXT] Navigation key changed from', prev, 'to', newKey);
      return newKey;
    });
    
    // Also try programmatic navigation as backup with multiple attempts
    const attemptNavigation = (attempt: number = 1) => {
      if (attempt > 3) {
        console.error('❌ [CONTEXT] Failed to navigate after 3 attempts');
        return;
      }

      setTimeout(() => {
        if (tabNavigatorRef.current) {
          try {
            console.log(`🎯 [CONTEXT] Attempting programmatic navigation (attempt ${attempt})`);
            
            // Get current state
            const state = tabNavigatorRef.current.getState?.();
            console.log('📊 [CONTEXT] Current tab state:', state);
            
            // Try jumpTo first (most reliable for tab navigation)
            if (typeof tabNavigatorRef.current.jumpTo === 'function') {
              tabNavigatorRef.current.jumpTo('Daily');
              console.log(`✅ [CONTEXT] Successfully used jumpTo method (attempt ${attempt})`);
              return;
            }
            
            // Fallback to navigate
            if (typeof tabNavigatorRef.current.navigate === 'function') {
              tabNavigatorRef.current.navigate('Daily');
              console.log(`✅ [CONTEXT] Successfully used navigate method (attempt ${attempt})`);
              return;
            }
            
            console.warn(`⚠️ [CONTEXT] No suitable navigation method found (attempt ${attempt})`);
          } catch (error) {
            console.error(`❌ [CONTEXT] Navigation attempt ${attempt} failed:`, error);
          }
        } else {
          console.warn(`⚠️ [CONTEXT] Tab navigator ref not available (attempt ${attempt})`);
        }
        
        // Try again
        attemptNavigation(attempt + 1);
      }, 100 * attempt); // Increasing delay for each attempt
    };

    attemptNavigation();
  }, [activeTab]);

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