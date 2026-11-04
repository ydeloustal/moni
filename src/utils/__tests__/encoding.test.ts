import { fromBase64, toBase64 } from '../base64';
import { csvCell, toCsvText } from '../csv';
import { newId } from '../id';

describe('base64', () => {
  it('round-trips every length', () => {
    for (let n = 0; n < 40; n++) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + n) % 256);
      expect(fromBase64(toBase64(bytes))).toEqual(bytes);
    }
  });

  it('matches RFC 4648 test vectors', () => {
    const enc = (s: string) => toBase64(Uint8Array.from(s, c => c.charCodeAt(0)));
    expect(['', 'f', 'fo', 'foo', 'foob', 'fooba', 'foobar'].map(enc)).toEqual([
      '',
      'Zg==',
      'Zm8=',
      'Zm9v',
      'Zm9vYg==',
      'Zm9vYmE=',
      'Zm9vYmFy',
    ]);
  });
});

describe('csv', () => {
  it('neutralises formulas and escapes separators', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('-2+3')).toBe("'-2+3");
    expect(csvCell('@cmd')).toBe("'@cmd");
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('dit "oui"')).toBe('"dit ""oui"""');
    expect(csvCell('x\ny')).toBe('"x\ny"');
    expect(csvCell(null)).toBe('');
  });

  it('starts with a BOM and uses CRLF', () => {
    expect(
      toCsvText([
        ['a', 'b'],
        [1, 2],
      ]),
    ).toBe('﻿a;b\r\n1;2\r\n');
  });
});

describe('ids', () => {
  it('builds 16-character ids from the random source', () => {
    const id = newId(n => new Uint8Array(n).fill(7));
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[0-9a-z]+$/);
  });
});
