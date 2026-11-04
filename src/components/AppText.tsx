import { Text, type TextProps, type TextStyle } from 'react-native';
import { fontFamily, typography, useColors, type Palette, type TextVariant } from '@/theme';

export type TextTone =
  'ink' | 'ink2' | 'muted' | 'good' | 'warn' | 'bad' | 'info' | 'link' | 'onPrimary';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: TextStyle['fontWeight'];
  /** Tabular digits, so that amounts line up. */
  numeric?: boolean;
  align?: TextStyle['textAlign'];
}

const toneColor = (c: Palette, tone: TextTone): string => c[tone];

export function AppText({
  variant = 'body',
  tone = 'ink',
  weight,
  numeric,
  align,
  style,
  ...props
}: AppTextProps) {
  const c = useColors();
  return (
    <Text
      maxFontSizeMultiplier={2}
      {...props}
      style={[
        typography[variant],
        { color: toneColor(c, tone), fontFamily },
        weight ? { fontWeight: weight } : null,
        numeric ? { fontVariant: ['tabular-nums'] } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
