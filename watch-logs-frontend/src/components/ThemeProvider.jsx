import { createContext, useContext, useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
  const { theme: themeSetting, setTheme } = useSettingsStore();
  const [resolvedTheme, setResolvedTheme] = useState('dark');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = () => {
      let theme;
      if (themeSetting === 'system') {
        theme = mediaQuery.matches ? 'dark' : 'light';
      } else {
        theme = themeSetting;
      }
      setResolvedTheme(theme);
      document.documentElement.setAttribute('data-theme', theme);
    };

    updateTheme();

    const listener = () => updateTheme();
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [themeSetting]);

  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const cycleTheme = () => {
    const order = ['system', 'dark', 'light'];
    const currentIndex = order.indexOf(themeSetting);
    const nextIndex = (currentIndex + 1) % order.length;
    setTheme(order[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, cycleTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
