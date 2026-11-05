/**
 * App lock: PIN rules, hashing and brute-force throttling. Pure and tested.
 *
 * The PIN is never stored: only a salted PBKDF2-SHA256 hash, in the platform's secure storage
 * (Keychain / Android Keystore). A 6-digit PIN has only 10^6 values, so the real protection is the secure
 * storage plus the growing waiting time after repeated failures.
 */
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { fromBase64, toBase64 } from '@/utils/base64';

export const PIN_LENGTH = 6;
export const PIN_ITERATIONS = 50_000;
/** Failed attempts allowed before waiting times start. */
export const FREE_ATTEMPTS = 5;

export interface PinRecord {
  v: 1;
  salt: string;
  hash: string;
  iterations: number;
}

export interface Throttle {
  failures: number;
  /** Epoch ms before which no attempt is accepted (0 = none). */
  lockedUntil: number;
}

export const NO_THROTTLE: Throttle = { failures: 0, lockedUntil: 0 };

const SEQUENCES = '0123456789012345678909876543210987654321';

/** Returns an error message, or null when the PIN can be used. */
export function pinFormatError(pin: string): string | null {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin))
    return `Le code doit contenir ${PIN_LENGTH} chiffres.`;
  if (/^(\d)\1+$/.test(pin)) return 'Évite un code fait d’un seul chiffre répété.';
  if (SEQUENCES.includes(pin)) return 'Évite une suite de chiffres comme 123456.';
  return null;
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  return pbkdf2Async(sha256, new TextEncoder().encode(pin), salt, {
    c: iterations,
    dkLen: 32,
    asyncTick: 10,
  });
}

export async function createPinRecord(
  pin: string,
  random: (n: number) => Uint8Array,
  iterations = PIN_ITERATIONS,
): Promise<PinRecord> {
  const error = pinFormatError(pin);
  if (error) throw new Error(error);
  const salt = random(16);
  return {
    v: 1,
    salt: toBase64(salt),
    hash: toBase64(await derive(pin, salt, iterations)),
    iterations,
  };
}

/** Constant-time comparison (the duration does not depend on where the bytes differ). */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export async function verifyPin(pin: string, record: PinRecord): Promise<boolean> {
  const actual = await derive(pin, fromBase64(record.salt), record.iterations);
  return equalBytes(actual, fromBase64(record.hash));
}

export function parsePinRecord(raw: string | null): PinRecord | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<PinRecord>;
    if (r.v !== 1 || typeof r.salt !== 'string' || typeof r.hash !== 'string') return null;
    if (typeof r.iterations !== 'number' || r.iterations < 1000 || r.iterations > 10_000_000)
      return null;
    return { v: 1, salt: r.salt, hash: r.hash, iterations: r.iterations };
  } catch {
    return null;
  }
}

export function parseThrottle(raw: string | null): Throttle {
  try {
    const t = JSON.parse(raw ?? '') as Partial<Throttle>;
    const failures = typeof t.failures === 'number' && t.failures >= 0 ? Math.floor(t.failures) : 0;
    const lockedUntil = typeof t.lockedUntil === 'number' && t.lockedUntil >= 0 ? t.lockedUntil : 0;
    return { failures, lockedUntil };
  } catch {
    return { ...NO_THROTTLE };
  }
}

/** Waiting time after `failures` failed attempts: 30 s, then doubling, up to 15 minutes. */
export function waitAfter(failures: number): number {
  if (failures < FREE_ATTEMPTS) return 0;
  return Math.min(15 * 60_000, 30_000 * 2 ** (failures - FREE_ATTEMPTS));
}

export function recordFailure(throttle: Throttle, now: number): Throttle {
  const failures = throttle.failures + 1;
  const wait = waitAfter(failures);
  return { failures, lockedUntil: wait ? now + wait : 0 };
}

export const remainingWait = (throttle: Throttle, now: number): number =>
  Math.max(0, throttle.lockedUntil - now);

/** Re-lock when the app comes back after this long in the background. */
export const RELOCK_AFTER_MS = 60_000;

export const shouldRelock = (backgroundedAt: number | null, now: number): boolean =>
  backgroundedAt !== null && now - backgroundedAt >= RELOCK_AFTER_MS;
