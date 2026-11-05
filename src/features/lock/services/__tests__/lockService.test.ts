import { FREE_ATTEMPTS } from '../../domain/pin';
import {
  checkPin,
  clearLock,
  hasPin,
  isBiometricsEnabled,
  setBiometricsEnabled,
  setPin,
} from '../lockService';

jest.mock('@/services/secure/secureStorage', () => {
  const values = new Map<string, string>();
  return {
    secureStorage: {
      get: async (k: string) => values.get(k) ?? null,
      set: async (k: string, v: string) => void values.set(k, v),
      remove: async (k: string) => void values.delete(k),
      isHardwareBacked: true,
    },
  };
});

jest.mock('@/utils/random', () => ({
  randomBytes: (n: number) => new Uint8Array(n).map((_, i) => (i * 31 + 7) % 256),
}));

jest.setTimeout(60_000);

describe('lock service', () => {
  beforeEach(() => clearLock());

  it('has no PIN until one is created', async () => {
    expect(await hasPin()).toBe(false);
    await setPin('482915');
    expect(await hasPin()).toBe(true);
    expect(await checkPin('482915')).toEqual({ ok: true });
  });

  it('counts failures across checks and makes the user wait', async () => {
    await setPin('482915');
    let last = await checkPin('000001', 1000);
    for (let i = 1; i < FREE_ATTEMPTS; i++) last = await checkPin('000001', 1000);
    expect(last).toEqual({ ok: false, waitMs: 30_000, failures: FREE_ATTEMPTS });
    // Even the right PIN is refused while waiting.
    expect(await checkPin('482915', 2000)).toMatchObject({ ok: false, waitMs: 29_000 });
    expect(await checkPin('482915', 40_000)).toEqual({ ok: true });
  });

  it('keeps the biometric preference, on by default', async () => {
    expect(await isBiometricsEnabled()).toBe(true);
    await setBiometricsEnabled(false);
    expect(await isBiometricsEnabled()).toBe(false);
  });
});
