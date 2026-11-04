import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type Preferences,
} from '@/services/preferences/preferences';
import { darkPalette, lightPalette, type Palette } from './colors';

export interface Theme {
  colors: Palette;
  scheme: 'light' | 'dark';
  preferences: Preferences;
  setPreferences: (changes: Partial<Preferences>) => void;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preferences, setState] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    let alive = true;
    void loadPreferences().then(p => {
      if (alive) setState(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setPreferences = useCallback((changes: Partial<Preferences>) => {
    setState(current => {
      const next = { ...current, ...changes };
      void savePreferences(next).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo<Theme>(() => {
    const scheme =
      preferences.theme === 'system' ? (system === 'dark' ? 'dark' : 'light') : preferences.theme;
    return {
      colors: scheme === 'dark' ? darkPalette : lightPalette,
      scheme,
      preferences,
      setPreferences,
    };
  }, [preferences, setPreferences, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}

export const useColors = (): Palette => useTheme().colors;
