import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { setCurrentTab as setNotificationCurrentTab } from '../lib/notifications';

interface NavigationContextType {
  currentTab: string | null;
  setCurrentTab: (tab: string | null) => void;
  isOnChatTab: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [currentTab, setCurrentTabState] = useState<string | null>(null);

  const setCurrentTab = useCallback((tab: string | null) => {
    setCurrentTabState(tab);
    // Sync with notification service
    setNotificationCurrentTab(tab);
  }, []);

  const isOnChatTab = currentTab === 'Chat';

  return (
    <NavigationContext.Provider value={{ 
      currentTab, 
      setCurrentTab, 
      isOnChatTab 
    }}>
      {children}
    </NavigationContext.Provider>
  );
};
