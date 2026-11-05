import { ACCENT_NAMES } from '@/services/preferences/preferences';
import { ACCENTS, darkPalette, lightPalette, paletteFor } from '../colors';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('menu accents', () => {
  it.each(ACCENT_NAMES)('%s stays readable (4.5:1) in both modes', name => {
    for (const [scheme, base] of [
      ['light', lightPalette],
      ['dark', darkPalette],
    ] as const) {
      const { fg, bg } = ACCENTS[name][scheme];
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(fg, base.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('applies the accent without touching the other tokens', () => {
    const p = paletteFor('dark', 'blue');
    expect(p.accent).toBe(ACCENTS.blue.dark.fg);
    expect(p.accentBg).toBe(ACCENTS.blue.dark.bg);
    expect(p.bg).toBe(darkPalette.bg);
    expect(paletteFor('light', 'ink')).toEqual(lightPalette);
  });
});
