/**
 * Simple preferences (not budget data): AsyncStorage on device, localStorage on the web.
 * Values are validated when read: a corrupted preference falls back to its default.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';
export type HistoryRange = 6 | 12;

export interface Preferences {
  theme: ThemePreference;
  historyRange: HistoryRange;
}

export const DEFAULT_PREFERENCES: Preferences = { theme: 'system', historyRange: 6 };

const KEY = 'moni.preferences.v1';

export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return { ...DEFAULT_PREFERENCES };
  try {
    const p = JSON.parse(raw) as Partial<Record<keyof Preferences, unknown>>;
    return {
      theme:
        p.theme === 'light' || p.theme === 'dark' || p.theme === 'system'
          ? p.theme
          : DEFAULT_PREFERENCES.theme,
      historyRange: p.historyRange === 12 ? 12 : 6,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function loadPreferences(): Promise<Preferences> {
  try {
    return parsePreferences(await AsyncStorage.getItem(KEY));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(preferences));
}

export async function clearPreferences(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
