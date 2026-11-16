import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext.tsx';
import { api } from '../lib/api.ts';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { dbUser } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>('light');

  useEffect(() => {
    if (dbUser?.preferences?.theme === 'dark' || dbUser?.preferences?.theme === 'light') {
      setThemeState(dbUser.preferences.theme);
    }
  }, [dbUser?.preferences?.theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    if (dbUser) {
      api.updateMyProfile({ preferences: { theme: mode } }).catch(() => {});
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }
  return ctx;
}
