import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DateNavigationContextType {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  navigateToDaily: (date: Date) => void;
  onNavigateToDaily?: (date: Date) => void;
  setNavigateToDaily: (callback: (date: Date) => void) => void;
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [onNavigateToDaily, setOnNavigateToDaily] = useState<((date: Date) => void) | undefined>();

  const navigateToDaily = (date: Date) => {
    setSelectedDate(date);
    if (onNavigateToDaily) {
      onNavigateToDaily(date);
    }
  };

  const setNavigateToDaily = (callback: (date: Date) => void) => {
    setOnNavigateToDaily(() => callback);
  };

  return (
    <DateNavigationContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        navigateToDaily,
        onNavigateToDaily,
        setNavigateToDaily,
      }}
    >
      {children}
    </DateNavigationContext.Provider>
  );
};