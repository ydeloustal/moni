import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearPreferences,
  DEFAULT_PREFERENCES,
  loadPreferences,
  parsePreferences,
  savePreferences,
} from '../preferences';

describe('preferences', () => {
  beforeEach(() => AsyncStorage.clear());

  it('returns defaults when nothing is stored', async () => {
    expect(await loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('persists and reads back preferences', async () => {
    await savePreferences({ theme: 'dark', accent: 'violet', historyRange: 12 });
    expect(await loadPreferences()).toEqual({ theme: 'dark', accent: 'violet', historyRange: 12 });
    await clearPreferences();
    expect(await loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('ignores corrupted values', () => {
    expect(parsePreferences('{')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{"theme":"pink","historyRange":7}')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{"accent":"gold"}')).toEqual(DEFAULT_PREFERENCES);
  });

  it('keeps a valid accent and defaults older files to the neutral one', () => {
    expect(parsePreferences('{"theme":"light","accent":"green"}').accent).toBe('green');
    expect(parsePreferences('{"theme":"light","historyRange":12}')).toEqual({
      theme: 'light',
      accent: 'ink',
      historyRange: 12,
    });
  });
});
