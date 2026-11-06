import { Platform, type TextStyle } from 'react-native';

/** 4-point spacing scale. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 } as const;

/** Minimum touch target (Apple HIG 44 pt, Material 48 dp): 44 everywhere, 48 on Android. */
export const TOUCH_TARGET = Platform.OS === 'android' ? 48 : 44;

/** Responsive breakpoints (logical pixels). */
export const breakpoints = { medium: 600, expanded: 1024, sideNavigation: 1200 } as const;
export const SIDE_NAVIGATION_WIDTH = 220;
export const MAX_CONTENT_WIDTH = 1120;

/** System fonts only: nothing is downloaded. */
export const fontFamily = Platform.select({
  web: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  default: undefined,
});

export type TextVariant =
  'hero' | 'display' | 'h1' | 'title' | 'heading' | 'body' | 'label' | 'caption';

export const typography: Record<TextVariant, TextStyle> = {
  /** Big amounts (current balance). */
  hero: { fontSize: 44, lineHeight: 50, fontWeight: '800', letterSpacing: -1.2 },
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.9 },
  /** Screen title, in the page body. */
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.3 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
};
