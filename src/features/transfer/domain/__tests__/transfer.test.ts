import { randomBytes } from 'node:crypto';
import { emptyState } from '@/features/budget/domain/state';
import { rule, state } from '@/test/fixtures';
import {
  assemble,
  collect,
  emptyCollector,
  isComplete,
  MAX_FRAMES,
  parseFrame,
  toFrames,
  type Frame,
} from '../frames';
import {
  CODE_LENGTH,
  formatCode,
  isCodeComplete,
  newSessionId,
  newTransferCode,
  normalizeCode,
  packTransfer,
  unpackTransfer,
} from '../payload';

const random = (n: number) => new Uint8Array(randomBytes(n));
const FAST = { params: { t: 1, m: 8192, p: 1 } };
const TODAY = '2026-11-06';

const frame = (raw: string): Frame => {
  const f = parseFrame(raw);
  if (!f) throw new Error(`invalid frame: ${raw}`);
  return f;
};

describe('frames', () => {
  it('splits a text and rebuilds it whatever the scan order, ignoring duplicates', () => {
    const text = 'x'.repeat(1234) + 'é|fin';
    const frames = toFrames(text, 'ABC123', 500);
    expect(frames).toHaveLength(3);
    let c = emptyCollector;
    for (const raw of [frames[2], frames[0], frames[2], frames[1]]) {
      c = collect(c, frame(raw ?? ''));
    }
    expect(isComplete(c)).toBe(true);
    expect(assemble(c)).toBe(text);
  });

  it('waits for the missing frames', () => {
    const frames = toFrames('abcdef', 'ABC123', 2);
    const c = collect(emptyCollector, frame(frames[0] ?? ''));
    expect(c.received).toBe(1);
    expect(assemble(c)).toBeNull();
  });

  it('starts over when another transfer is scanned', () => {
    const a = toFrames('aaaa', 'AAAAAA', 2);
    const b = toFrames('bbbb', 'BBBBBB', 2);
    let c = collect(emptyCollector, frame(a[0] ?? ''));
    c = collect(c, frame(b[1] ?? ''));
    expect(c.session).toBe('BBBBBB');
    expect(c.received).toBe(1);
  });

  it('rejects anything that is not a Moni frame', () => {
    expect(parseFrame('https://example.com')).toBeNull();
    expect(parseFrame('MONI1|abc|1|2|x')).toBeNull();
    expect(parseFrame('MONI1|ABC123|3|2|x')).toBeNull();
    expect(parseFrame('MONI1|ABC123|0|2|x')).toBeNull();
    expect(parseFrame(`MONI1|ABC123|1|${MAX_FRAMES + 1}|x`)).toBeNull();
    expect(parseFrame('MONI1|ABC123|1|1|' + 'x'.repeat(5000))).toBeNull();
  });
});

describe('transfer code', () => {
  it('is 10 unambiguous characters, typed with any case, spaces or dash', () => {
    const code = newTransferCode(random);
    expect(code).toHaveLength(CODE_LENGTH);
    expect(code).not.toMatch(/[01IO]/);
    expect(newSessionId(random)).toMatch(/^[A-Z0-9]{6}$/);
    expect(formatCode('ABCDEFGHJK')).toBe('ABCDE-FGHJK');
    expect(normalizeCode(' abcde-fghjk ')).toBe('ABCDEFGHJK');
    expect(isCodeComplete('abcde fghjk')).toBe(true);
    expect(isCodeComplete('ABCDE-FGHJ')).toBe(false);
    expect(isCodeComplete('ABCDE-FGHJ0')).toBe(false);
  });
});

describe('payload', () => {
  const s = state({
    ...emptyState(TODAY),
    rules: [rule({ id: 'r1', amount: 62000, name: 'Loyer' })],
  });

  it('round-trips the state through QR frames with the right code', async () => {
    const code = newTransferCode(random);
    const text = await packTransfer(s, code, random, FAST);
    let c = emptyCollector;
    for (const raw of toFrames(text, 'ABC123')) c = collect(c, frame(raw));
    const result = await unpackTransfer(assemble(c) ?? '', formatCode(code).toLowerCase(), TODAY);
    expect(result.state.rules.map(r => r.name)).toEqual(['Loyer']);
  });

  it('refuses a wrong code without revealing anything', async () => {
    const text = await packTransfer(s, 'ABCDEFGHJK', random, FAST);
    await expect(unpackTransfer(text, 'ABCDEFGHJM', TODAY)).rejects.toThrow('Code incorrect');
  });

  it('never carries the data in clear', async () => {
    const text = await packTransfer(s, 'ABCDEFGHJK', random, FAST);
    expect(text).not.toContain('Loyer');
    await expect(unpackTransfer('{"not":"moni"}', 'ABCDEFGHJK', TODAY)).rejects.toThrow(
      'Transfert illisible',
    );
  });
});

describe('QR round trip (generator → pixels → jsQR)', () => {
  // What a webcam sees: each frame drawn black on white, then decoded by the web scanner's library.
  const qrcodeGenerator = jest.requireActual<typeof import('qrcode-generator')>('qrcode-generator');
  const jsQR = jest.requireActual<typeof import('jsqr')>('jsqr').default;

  function scan(text: string): string | null {
    const qr = qrcodeGenerator(0, 'L');
    qr.addData(text, 'Byte');
    qr.make();
    const n = qr.getModuleCount() + 8; // quiet zone, as drawn by QrCode
    const px = 4;
    const size = n * px;
    const data = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let r = 0; r < n - 8; r++) {
      for (let c = 0; c < n - 8; c++) {
        if (!qr.isDark(r, c)) continue;
        for (let y = 0; y < px; y++) {
          for (let x = 0; x < px; x++) {
            const i = (((r + 4) * px + y) * size + (c + 4) * px + x) * 4;
            data[i] = data[i + 1] = data[i + 2] = 0;
          }
        }
      }
    }
    return jsQR(data, size, size)?.data ?? null;
  }

  it('decodes every frame of a real transfer and restores the state', async () => {
    const s = state({
      ...emptyState(TODAY),
      rules: [rule({ id: 'r1', amount: 62000, name: 'Loyer' })],
    });
    const code = newTransferCode(random);
    const frames = toFrames(await packTransfer(s, code, random, FAST), 'ABC123');
    let c = emptyCollector;
    for (const raw of frames) {
      const read = scan(raw);
      expect(read).toBe(raw);
      c = collect(c, frame(read ?? ''));
    }
    const result = await unpackTransfer(assemble(c) ?? '', code, TODAY);
    expect(result.state.rules[0]?.name).toBe('Loyer');
  });
});
