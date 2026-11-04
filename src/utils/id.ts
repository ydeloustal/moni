import { randomBytes } from './random';

/** Random identifier (no personal data in it). */
export function newId(random: (count: number) => Uint8Array = randomBytes): string {
  return Array.from(random(9), b => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}
