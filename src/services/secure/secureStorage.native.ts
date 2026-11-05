/** iOS Keychain / Android Keystore (encrypted, private to the app, excluded from device backups). */
import * as SecureStore from 'expo-secure-store';

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const secureStorage = {
  get: (key: string): Promise<string | null> => SecureStore.getItemAsync(key, OPTIONS),
  set: (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value, OPTIONS),
  remove: (key: string): Promise<void> => SecureStore.deleteItemAsync(key, OPTIONS),
  /** Whether the storage is backed by the platform's secure hardware. */
  isHardwareBacked: true,
};
