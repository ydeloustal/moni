import type { AccentPreference } from '@/services/preferences/preferences';

/**
 * Colour tokens. Text/background pairs meet WCAG AA (4.5:1) in both modes;
 * `inc`/`exp`/`save` are chart colours used with a text label, never alone.
 */
export interface Palette {
  bg: string;
  surface: string;
  sunken: string;
  chip: string;
  line: string;
  lineStrong: string;
  ink: string;
  ink2: string;
  muted: string;
  link: string;
  primary: string;
  onPrimary: string;
  inc: string;
  exp: string;
  save: string;
  good: string;
  goodBg: string;
  goodLine: string;
  warn: string;
  warnBg: string;
  warnLine: string;
  bad: string;
  badBg: string;
  badLine: string;
  info: string;
  infoBg: string;
  infoLine: string;
  focus: string;
  scrim: string;
  /** Active navigation item: text/icon colour and its background (from the accent preference). */
  accent: string;
  accentBg: string;
  /** Large summary card ("Solde actuel"): dark in both modes. */
  hero: string;
  heroLine: string;
  onHero: string;
  heroMuted: string;
  heroTile: string;
  heroGood: string;
  heroBad: string;
}

/**
 * Menu accent colours. Each `fg` meets 4.5:1 on its `bg` and on `surface`, in both modes,
 * so the 12 px tab labels stay readable.
 */
export const ACCENTS: Record<
  AccentPreference,
  { label: string; light: { fg: string; bg: string }; dark: { fg: string; bg: string } }
> = {
  ink: {
    label: 'Neutre',
    light: { fg: '#0f172a', bg: '#e8ebf0' },
    dark: { fg: '#eef1f5', bg: '#252c38' },
  },
  blue: {
    label: 'Bleu',
    light: { fg: '#1d5bb0', bg: '#e3edfb' },
    dark: { fg: '#8dbaf6', bg: '#1b2b45' },
  },
  green: {
    label: 'Vert',
    light: { fg: '#11683a', bg: '#dff3e7' },
    dark: { fg: '#62d595', bg: '#15301f' },
  },
  violet: {
    label: 'Violet',
    light: { fg: '#5a3bc2', bg: '#ece7fd' },
    dark: { fg: '#b6a5fb', bg: '#2a2347' },
  },
  orange: {
    label: 'Orange',
    light: { fg: '#9c4510', bg: '#fde9dc' },
    dark: { fg: '#f6a670', bg: '#3a2416' },
  },
  pink: {
    label: 'Rose',
    light: { fg: '#a3216a', bg: '#fbe4f0' },
    dark: { fg: '#f290c3', bg: '#3a1a2b' },
  },
};

/** Base palette for a colour scheme, with the chosen menu accent applied. */
export function paletteFor(scheme: 'light' | 'dark', accent: AccentPreference): Palette {
  const base = scheme === 'dark' ? darkPalette : lightPalette;
  const a = ACCENTS[accent][scheme];
  return { ...base, accent: a.fg, accentBg: a.bg };
}

export const lightPalette: Palette = {
  bg: '#f6f7f9',
  surface: '#ffffff',
  sunken: '#f1f3f6',
  chip: '#e8ebf0',
  line: '#e7e9ee',
  lineStrong: '#d5d9e0',
  ink: '#0f172a',
  ink2: '#3f4a5c',
  muted: '#5b6577',
  link: '#1d4ed8',
  primary: '#0f172a',
  onPrimary: '#ffffff',
  inc: '#2563eb',
  exp: '#ea580c',
  save: '#10b981',
  good: '#15803d',
  goodBg: '#ecfdf5',
  goodLine: '#a7f3d0',
  warn: '#92400e',
  warnBg: '#fffbeb',
  warnLine: '#fde68a',
  bad: '#b91c1c',
  badBg: '#fef2f2',
  badLine: '#fecaca',
  info: '#1d4ed8',
  infoBg: '#eff6ff',
  infoLine: '#cfe0fb',
  focus: '#2563eb',
  scrim: 'rgba(15, 23, 42, 0.5)',
  accent: '#0f172a',
  accentBg: '#e8ebf0',
  hero: '#0f172a',
  heroLine: '#0f172a',
  onHero: '#ffffff',
  heroMuted: '#cbd5e1',
  heroTile: 'rgba(255, 255, 255, 0.08)',
  heroGood: '#4ade80',
  heroBad: '#fca5a5',
};

export const darkPalette: Palette = {
  bg: '#0b0f17',
  surface: '#141a23',
  sunken: '#1c2431',
  chip: '#252c38',
  line: '#252c38',
  lineStrong: '#3a4456',
  ink: '#eef1f5',
  ink2: '#b6c0ce',
  muted: '#9aa4b2',
  link: '#93c5fd',
  primary: '#eef1f5',
  onPrimary: '#0b0f17',
  inc: '#60a5fa',
  exp: '#fb923c',
  save: '#34d399',
  good: '#4ade80',
  goodBg: '#12291c',
  goodLine: '#1f4a31',
  warn: '#fbbf24',
  warnBg: '#2a2210',
  warnLine: '#5c4415',
  bad: '#f87171',
  badBg: '#2e1513',
  badLine: '#5b2420',
  info: '#93c5fd',
  infoBg: '#13213b',
  infoLine: '#23395f',
  focus: '#93c5fd',
  scrim: 'rgba(0, 0, 0, 0.6)',
  accent: '#eef1f5',
  accentBg: '#252c38',
  hero: '#1c2431',
  heroLine: '#2b3545',
  onHero: '#ffffff',
  heroMuted: '#b6c0ce',
  heroTile: 'rgba(255, 255, 255, 0.05)',
  heroGood: '#4ade80',
  heroBad: '#fca5a5',
};
