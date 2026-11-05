/// <reference types="node" />
import { randomBytes } from 'node:crypto';
import {
  createPinRecord,
  FREE_ATTEMPTS,
  NO_THROTTLE,
  parsePinRecord,
  parseThrottle,
  pinFormatError,
  recordFailure,
  remainingWait,
  shouldRelock,
  verifyPin,
  waitAfter,
} from '../pin';

const random = (n: number) => new Uint8Array(randomBytes(n));

describe('PIN format', () => {
  it('requires 6 digits and rejects trivial codes', () => {
    expect(pinFormatError('482915')).toBeNull();
    expect(pinFormatError('48291')).toMatch(/6 chiffres/);
    expect(pinFormatError('48291a')).toMatch(/6 chiffres/);
    expect(pinFormatError('111111')).toMatch(/répété/);
    expect(pinFormatError('123456')).toMatch(/suite/);
    expect(pinFormatError('987654')).toMatch(/suite/);
  });
});

describe('PIN hashing', () => {
  it('stores a salted hash, never the PIN, and verifies it', async () => {
    const record = await createPinRecord('482915', random, 2000);
    expect(JSON.stringify(record)).not.toContain('482915');
    expect(await verifyPin('482915', record)).toBe(true);
    expect(await verifyPin('482916', record)).toBe(false);
    const other = await createPinRecord('482915', random, 2000);
    expect(other.hash).not.toBe(record.hash);
  });

  it('refuses to create a weak PIN', async () => {
    await expect(createPinRecord('000000', random, 2000)).rejects.toThrow();
  });

  it('parses stored records defensively', async () => {
    const record = await createPinRecord('482915', random, 2000);
    expect(parsePinRecord(JSON.stringify(record))).toEqual(record);
    expect(parsePinRecord(null)).toBeNull();
    expect(parsePinRecord('{')).toBeNull();
    expect(parsePinRecord(JSON.stringify({ ...record, iterations: 1 }))).toBeNull();
  });
});

describe('throttling', () => {
  it('lets a few attempts through, then waits longer and longer, capped at 15 minutes', () => {
    expect(waitAfter(FREE_ATTEMPTS - 1)).toBe(0);
    expect(waitAfter(FREE_ATTEMPTS)).toBe(30_000);
    expect(waitAfter(FREE_ATTEMPTS + 1)).toBe(60_000);
    expect(waitAfter(50)).toBe(15 * 60_000);
  });

  it('records failures and computes the remaining wait', () => {
    let t = NO_THROTTLE;
    for (let i = 0; i < FREE_ATTEMPTS; i++) t = recordFailure(t, 1000);
    expect(t).toEqual({ failures: FREE_ATTEMPTS, lockedUntil: 31_000 });
    expect(remainingWait(t, 11_000)).toBe(20_000);
    expect(remainingWait(t, 40_000)).toBe(0);
    expect(parseThrottle(JSON.stringify(t))).toEqual(t);
    expect(parseThrottle('garbage')).toEqual(NO_THROTTLE);
  });

  it('re-locks after a minute in the background', () => {
    expect(shouldRelock(null, 10)).toBe(false);
    expect(shouldRelock(0, 59_999)).toBe(false);
    expect(shouldRelock(0, 60_000)).toBe(true);
  });
});
