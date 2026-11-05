/** Persistence of the lock settings in the platform's secure storage. */
import { secureStorage } from '@/services/secure/secureStorage';
import { randomBytes } from '@/utils/random';
import {
  createPinRecord,
  NO_THROTTLE,
  parsePinRecord,
  parseThrottle,
  recordFailure,
  remainingWait,
  verifyPin,
  type Throttle,
} from '../domain/pin';

const KEYS = {
  pin: 'moni.lock.pin.v1',
  throttle: 'moni.lock.throttle.v1',
  biometrics: 'moni.lock.biometrics.v1',
} as const;

export async function hasPin(): Promise<boolean> {
  return parsePinRecord(await secureStorage.get(KEYS.pin)) !== null;
}

export async function setPin(pin: string): Promise<void> {
  const record = await createPinRecord(pin, randomBytes);
  await secureStorage.set(KEYS.pin, JSON.stringify(record));
  await secureStorage.set(KEYS.throttle, JSON.stringify(NO_THROTTLE));
}

export async function getThrottle(): Promise<Throttle> {
  return parseThrottle(await secureStorage.get(KEYS.throttle));
}

export type PinCheck = { ok: true } | { ok: false; waitMs: number; failures: number };

/** Checks a PIN, counting failures (persisted, so restarting the app does not reset them). */
export async function checkPin(pin: string, now = Date.now()): Promise<PinCheck> {
  const throttle = await getThrottle();
  const wait = remainingWait(throttle, now);
  if (wait > 0) return { ok: false, waitMs: wait, failures: throttle.failures };
  const record = parsePinRecord(await secureStorage.get(KEYS.pin));
  if (record && (await verifyPin(pin, record))) {
    await secureStorage.set(KEYS.throttle, JSON.stringify(NO_THROTTLE));
    return { ok: true };
  }
  const next = recordFailure(throttle, now);
  await secureStorage.set(KEYS.throttle, JSON.stringify(next));
  return { ok: false, waitMs: remainingWait(next, now), failures: next.failures };
}

export async function resetThrottle(): Promise<void> {
  await secureStorage.set(KEYS.throttle, JSON.stringify(NO_THROTTLE));
}

/** Biometric unlock preference (on by default when the device supports it). */
export async function isBiometricsEnabled(): Promise<boolean> {
  return (await secureStorage.get(KEYS.biometrics)) !== 'off';
}

export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
  await secureStorage.set(KEYS.biometrics, enabled ? 'on' : 'off');
}

/** Removes the PIN (forgotten PIN: only together with erasing all data). */
export async function clearLock(): Promise<void> {
  await Promise.all(Object.values(KEYS).map(k => secureStorage.remove(k)));
}
