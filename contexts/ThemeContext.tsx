import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTheme as useThemePreference } from '../hooks/useTheme';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  glass: {
    blur: number;
    opacity: number;
    saturation: number;
    radius: number;
  };
  updateGlass: (key: keyof ThemeContextType['glass'], value: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_GLASS = {
  blur: 20,
  opacity: 0.2,
  saturation: 150,
  radius: 24,
};

export const ThemeProvider = ({ children }: React.PropsWithChildren) => {
  const { theme, toggleTheme } = useThemePreference();
  const [glass, setGlass] = useState(DEFAULT_GLASS);

  const updateGlass = (key: keyof ThemeContextType['glass'], value: number) => {
    setGlass(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--glass-blur', `${glass.blur}px`);
    document.documentElement.style.setProperty('--glass-opacity', `${glass.opacity}`);
    document.documentElement.style.setProperty('--glass-saturation', `${glass.saturation}%`);
    document.documentElement.style.setProperty('--glass-radius', `${glass.radius}px`);
  }, [glass]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, glass, updateGlass }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

export const useTheme = () => useThemeContext();
