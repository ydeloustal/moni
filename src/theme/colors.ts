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
    light: { fg: '#14181f', bg: '#e9ecf1' },
    dark: { fg: '#eef1f5', bg: '#262c37' },
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
  bg: '#f4f5f7',
  surface: '#ffffff',
  sunken: '#eef0f3',
  chip: '#e9ecf1',
  line: '#e4e7ec',
  lineStrong: '#c7ccd4',
  ink: '#14181f',
  ink2: '#4b5360',
  muted: '#5f6876',
  link: '#1f66bd',
  primary: '#14181f',
  onPrimary: '#ffffff',
  inc: '#2a78d6',
  exp: '#eb6834',
  save: '#1baf7a',
  good: '#12703a',
  goodBg: '#eaf7ef',
  goodLine: '#c9e8d5',
  warn: '#97560a',
  warnBg: '#fff5e0',
  warnLine: '#f1d49b',
  bad: '#b42318',
  badBg: '#fdedec',
  badLine: '#f3c5c1',
  info: '#1f4f8f',
  infoBg: '#eaf1fb',
  infoLine: '#cfdcf0',
  focus: '#2a78d6',
  scrim: 'rgba(15, 18, 23, 0.45)',
  accent: '#14181f',
  accentBg: '#e9ecf1',
};

export const darkPalette: Palette = {
  bg: '#0f1217',
  surface: '#171b22',
  sunken: '#1e232c',
  chip: '#262c37',
  line: '#2a303b',
  lineStrong: '#424a59',
  ink: '#eef1f5',
  ink2: '#c3c9d2',
  muted: '#9da6b3',
  link: '#7cb0f2',
  primary: '#eef1f5',
  onPrimary: '#0f1217',
  inc: '#5b9be6',
  exp: '#f08a5d',
  save: '#3cc995',
  good: '#4ade80',
  goodBg: '#12291c',
  goodLine: '#1f4a31',
  warn: '#f4b860',
  warnBg: '#2c2210',
  warnLine: '#5c4415',
  bad: '#f97066',
  badBg: '#2e1513',
  badLine: '#5b2420',
  info: '#9cc3f5',
  infoBg: '#14213a',
  infoLine: '#25385c',
  focus: '#7cb0f2',
  scrim: 'rgba(0, 0, 0, 0.6)',
  accent: '#eef1f5',
  accentBg: '#262c37',
};
