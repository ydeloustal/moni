import { Platform, type TextStyle } from 'react-native';

/** 4-point spacing scale. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

/** Minimum touch target (Apple HIG 44 pt, Material 48 dp): 44 everywhere, 48 on Android. */
export const TOUCH_TARGET = Platform.OS === 'android' ? 48 : 44;

/** Responsive breakpoints (logical pixels). */
export const breakpoints = { medium: 600, expanded: 1024 } as const;
export const MAX_CONTENT_WIDTH = 1120;

/** System fonts only: nothing is downloaded. */
export const fontFamily = Platform.select({
  web: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  default: undefined,
});

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';

export const typography: Record<TextVariant, TextStyle> = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
};
