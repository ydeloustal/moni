/**
 * Encrypted backups (.moni file).
 *
 * - Key derivation: Argon2id (OWASP minimum parameters: 19 MiB, 2 passes, 1 lane).
 * - Authenticated encryption: XChaCha20-Poly1305 (random 24-byte nonce).
 * - The header (format, version, parameters) is authenticated as associated data: changing it breaks decryption.
 * - Libraries: @noble/hashes and @noble/ciphers (audited pure JavaScript, no native code, same on every platform).
 *
 * Limits: a weak passphrase can be attacked offline; a forgotten passphrase = an unrecoverable backup.
 */
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { argon2idAsync } from '@noble/hashes/argon2.js';
import { fromBase64, toBase64 } from '@/utils/base64';

export const BACKUP_FORMAT = 'moni-backup';
export const BACKUP_EXTENSION = '.moni';
export const MIN_PASSPHRASE = 10;
export const DEFAULT_KDF = { t: 2, m: 19456, p: 1 } as const;

export interface KdfParams {
  name: 'argon2id';
  t: number;
  m: number;
  p: number;
  salt: string;
}

export interface EncryptedEnvelope {
  format: typeof BACKUP_FORMAT;
  v: 1;
  encrypted: true;
  kdf: KdfParams;
  cipher: 'xchacha20poly1305';
  nonce: string;
  data: string;
}

interface PlainEnvelope {
  format: typeof BACKUP_FORMAT;
  v: 1;
  encrypted: false;
  data: unknown;
}

export type ParsedBackup =
  | { kind: 'encrypted'; envelope: EncryptedEnvelope }
  | { kind: 'plain'; data: unknown }
  /** Export of the legacy PHP version (moni.json) or raw JSON. */
  | { kind: 'raw'; data: unknown };

export interface CryptoOptions {
  params?: { t: number; m: number; p: number };
  onProgress?: (progress: number) => void;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const normalize = (passphrase: string): Uint8Array => encoder.encode(passphrase.normalize('NFKC'));
const header = (kdf: KdfParams): Uint8Array =>
  encoder.encode(JSON.stringify({ format: BACKUP_FORMAT, v: 1, kdf, cipher: 'xchacha20poly1305' }));

function deriveKey(
  passphrase: string,
  kdf: KdfParams,
  onProgress?: (p: number) => void,
): Promise<Uint8Array> {
  return argon2idAsync(normalize(passphrase), fromBase64(kdf.salt), {
    t: kdf.t,
    m: kdf.m,
    p: kdf.p,
    dkLen: 32,
    // Yields to the event loop regularly so that the UI stays responsive.
    asyncTick: 10,
    ...(onProgress ? { onProgress } : {}),
  });
}

export const isPassphraseLongEnough = (passphrase: string): boolean =>
  passphrase.normalize('NFKC').length >= MIN_PASSPHRASE;

/** Encrypts raw bytes into a backup envelope. `random(n)` must be cryptographically secure. */
export async function encryptBytes(
  bytes: Uint8Array,
  passphrase: string,
  random: (n: number) => Uint8Array,
  options: CryptoOptions = {},
): Promise<EncryptedEnvelope> {
  if (!isPassphraseLongEnough(passphrase)) {
    throw new Error(`Phrase de passe trop courte (${MIN_PASSPHRASE} caractères minimum).`);
  }
  const kdf: KdfParams = {
    name: 'argon2id',
    ...(options.params ?? DEFAULT_KDF),
    salt: toBase64(random(16)),
  };
  const nonce = random(24);
  const key = await deriveKey(passphrase, kdf, options.onProgress);
  try {
    const data = xchacha20poly1305(key, nonce, header(kdf)).encrypt(bytes);
    return {
      format: BACKUP_FORMAT,
      v: 1,
      encrypted: true,
      kdf,
      cipher: 'xchacha20poly1305',
      nonce: toBase64(nonce),
      data: toBase64(data),
    };
  } finally {
    key.fill(0);
  }
}

/** Encrypts a text (the JSON state). `random(n)` must be cryptographically secure. */
export async function encryptBackup(
  plaintext: string,
  passphrase: string,
  random: (n: number) => Uint8Array,
  options: CryptoOptions = {},
): Promise<string> {
  return JSON.stringify(await encryptBytes(encoder.encode(plaintext), passphrase, random, options));
}

/** UNENCRYPTED export (readable by anyone): for informed use only (spreadsheet, migration). */
export function plainBackup(state: unknown): string {
  const envelope: PlainEnvelope = { format: BACKUP_FORMAT, v: 1, encrypted: false, data: state };
  return JSON.stringify(envelope, null, 2);
}

export function parseBackup(text: string): ParsedBackup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde Moni lisible.");
  }
  const o = (json ?? {}) as Partial<Record<keyof EncryptedEnvelope, unknown>>;
  if (o.format !== BACKUP_FORMAT) return { kind: 'raw', data: json };
  if (o.v !== 1) {
    throw new Error(
      "Sauvegarde créée par une version plus récente de Moni : mets l'application à jour.",
    );
  }
  if (o.encrypted !== true) return { kind: 'plain', data: o.data };
  const k = (o.kdf ?? {}) as Partial<KdfParams>;
  // Bounds: rejects absurd parameters (a trapped file that would freeze the device).
  const valid =
    k.name === 'argon2id' &&
    typeof k.t === 'number' &&
    k.t >= 1 &&
    k.t <= 10 &&
    typeof k.m === 'number' &&
    k.m >= 8192 &&
    k.m <= 262144 &&
    k.p === 1 &&
    typeof k.salt === 'string' &&
    o.cipher === 'xchacha20poly1305' &&
    typeof o.nonce === 'string' &&
    typeof o.data === 'string';
  if (!valid) throw new Error('Sauvegarde chiffrée invalide.');
  return { kind: 'encrypted', envelope: o as EncryptedEnvelope };
}

/** Decrypts an envelope back to raw bytes. Wrong passphrase or tampered data: throws. */
export async function decryptBytes(
  envelope: EncryptedEnvelope,
  passphrase: string,
  options: Pick<CryptoOptions, 'onProgress'> = {},
): Promise<Uint8Array> {
  const key = await deriveKey(passphrase, envelope.kdf, options.onProgress);
  try {
    const cipher = xchacha20poly1305(key, fromBase64(envelope.nonce), header(envelope.kdf));
    return cipher.decrypt(fromBase64(envelope.data));
  } catch {
    throw new Error('Phrase de passe incorrecte, ou fichier modifié.');
  } finally {
    key.fill(0);
  }
}

export async function decryptBackup(
  envelope: EncryptedEnvelope,
  passphrase: string,
  options: Pick<CryptoOptions, 'onProgress'> = {},
): Promise<string> {
  return decoder.decode(await decryptBytes(envelope, passphrase, options));
}
