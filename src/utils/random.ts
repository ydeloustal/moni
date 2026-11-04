import { getRandomBytes } from 'expo-crypto';

/** Cryptographically secure random bytes (SecRandom / SecureRandom on device, WebCrypto on the web). */
export const randomBytes = (count: number): Uint8Array => getRandomBytes(count);
