import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryLight: string;
  border: string;
  cardBackground: string;
  cardBorder: string;
  error: string;
}

export const lightTheme: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#1F2937',
  textSecondary: '#6B7280',
  primary: '#2171C1',
  primaryLight: '#93C5FD',
  border: '#E5E7EB',
  cardBackground: '#FFFFFF',
  cardBorder: '#E5E7EB',
  error: '#DC2626',
};

export const darkTheme: ThemeColors = {
  background: '#111827',
  surface: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  primary: '#60A5FA',
  primaryLight: '#3B82F6',
  border: '#374151',
  cardBackground: '#1F2937',
  cardBorder: '#374151',
  error: '#EF4444',
};

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  colors: lightTheme,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const colors = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 