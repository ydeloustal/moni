/**
 * Splits a text into numbered QR frames, and puts them back together on the other side.
 * The frames loop on the sending screen: the receiver can catch them in any order and
 * simply waits for the ones it missed. Pure functions: no camera, no React.
 */

export const FRAME_PREFIX = 'MONI1';
/** Characters of payload per QR code: dense enough to be quick, sparse enough to scan on a phone. */
export const DEFAULT_CHUNK = 600;
/** Upper bound on the number of frames (≈ 1,2 Mo): rejects absurd or trapped sequences. */
export const MAX_FRAMES = 2000;
const MAX_CHUNK = 2000;
const SESSION = /^[A-Z0-9]{6}$/;

export interface Frame {
  session: string;
  index: number;
  total: number;
  chunk: string;
}

export function toFrames(text: string, session: string, size = DEFAULT_CHUNK): string[] {
  if (!SESSION.test(session)) throw new Error('Identifiant de transfert invalide.');
  const total = Math.max(1, Math.ceil(text.length / size));
  if (total > MAX_FRAMES) throw new Error('Trop de données à transférer par QR code.');
  const frames: string[] = [];
  for (let i = 0; i < total; i++) {
    frames.push(
      `${FRAME_PREFIX}|${session}|${i + 1}|${total}|${text.slice(i * size, (i + 1) * size)}`,
    );
  }
  return frames;
}

export function parseFrame(raw: string): Frame | null {
  if (!raw.startsWith(`${FRAME_PREFIX}|`)) return null;
  const parts = raw.split('|');
  if (parts.length < 5) return null;
  const [, session = '', i = '', n = ''] = parts;
  const chunk = parts.slice(4).join('|');
  const index = Number(i);
  const total = Number(n);
  if (
    !SESSION.test(session) ||
    !Number.isInteger(index) ||
    !Number.isInteger(total) ||
    total < 1 ||
    total > MAX_FRAMES ||
    index < 1 ||
    index > total ||
    chunk.length > MAX_CHUNK
  ) {
    return null;
  }
  return { session, index, total, chunk };
}

export interface Collector {
  session: string | null;
  total: number;
  parts: readonly (string | undefined)[];
  received: number;
}

export const emptyCollector: Collector = { session: null, total: 0, parts: [], received: 0 };

/** Adds a frame. A frame from another transfer starts over (the sender restarted). */
export function collect(c: Collector, frame: Frame): Collector {
  const fresh = c.session !== frame.session || c.total !== frame.total;
  const base: Collector = fresh
    ? { session: frame.session, total: frame.total, parts: new Array(frame.total), received: 0 }
    : c;
  if (base.parts[frame.index - 1] !== undefined) return base;
  const parts = [...base.parts];
  parts[frame.index - 1] = frame.chunk;
  return { ...base, parts, received: base.received + 1 };
}

export const isComplete = (c: Collector): boolean => c.total > 0 && c.received === c.total;

export function assemble(c: Collector): string | null {
  return isComplete(c) ? c.parts.join('') : null;
}
