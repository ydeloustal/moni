/**
 * Transfer payload: the state, compressed then encrypted with a one-time code shown on the
 * sending device. Same envelope as a .moni backup (Argon2id + XChaCha20-Poly1305), so the
 * receiving side reuses the backup validation. Nothing ever leaves the devices except as
 * light (QR codes) or as a file the user moves themself.
 */
import { deflateSync, inflateSync } from 'fflate';
import {
  decryptBytes,
  encryptBytes,
  parseBackup,
  type CryptoOptions,
} from '@/features/backup/domain/crypto';
import { importData, type ImportResult } from '@/features/backup/domain/importData';
import type { BudgetState } from '@/types/domain';
import type { Day } from '@/utils/dates';

/** No 0/O, 1/I: easy to read aloud and to type. 32 symbols, 10 characters = 50 bits. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 10;
/** Decompressed size limit, like file imports. */
const MAX_JSON_BYTES = 20_000_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function pick(random: (n: number) => Uint8Array, count: number): string {
  // 256 is a multiple of 32: a byte modulo 32 is unbiased.
  return Array.from(random(count), b => ALPHABET[b % ALPHABET.length]).join('');
}

export const newTransferCode = (random: (n: number) => Uint8Array): string =>
  pick(random, CODE_LENGTH);

export const newSessionId = (random: (n: number) => Uint8Array): string => pick(random, 6);

/** "ABCDEFGHJK" → "ABCDE-FGHJK". */
export const formatCode = (code: string): string => `${code.slice(0, 5)}-${code.slice(5)}`;

/** What the user typed → canonical code (case, spaces and dashes ignored). */
export const normalizeCode = (input: string): string =>
  input.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isCodeComplete = (input: string): boolean =>
  normalizeCode(input).length === CODE_LENGTH &&
  [...normalizeCode(input)].every(ch => ALPHABET.includes(ch));

export async function packTransfer(
  state: BudgetState,
  code: string,
  random: (n: number) => Uint8Array,
  options: CryptoOptions = {},
): Promise<string> {
  const compressed = deflateSync(encoder.encode(JSON.stringify(state)), { level: 9 });
  const envelope = await encryptBytes(compressed, normalizeCode(code), random, options);
  return JSON.stringify(envelope);
}

export async function unpackTransfer(
  text: string,
  code: string,
  today: Day,
  onProgress?: (progress: number) => void,
): Promise<ImportResult> {
  const parsed = parseBackup(text);
  if (parsed.kind !== 'encrypted') throw new Error('Transfert illisible : recommence le scan.');
  let bytes: Uint8Array;
  try {
    bytes = await decryptBytes(parsed.envelope, normalizeCode(code), { onProgress });
  } catch {
    throw new Error('Code incorrect. Vérifie le code affiché sur l’autre appareil.');
  }
  let json: unknown;
  try {
    const raw = inflateSync(bytes);
    if (raw.length > MAX_JSON_BYTES) throw new Error('too large');
    json = JSON.parse(decoder.decode(raw));
  } catch {
    throw new Error('Le contenu du transfert est illisible.');
  }
  return importData(json, today);
}
