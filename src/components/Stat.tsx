import { StyleSheet, View } from 'react-native';
import { radius, space, useColors } from '@/theme';
import { AppText, type TextTone } from './AppText';

/** Key figure: label + value (+ optional caption). Read as one sentence by screen readers. */
export function Stat({
  label,
  value,
  caption,
  tone = 'ink',
  large,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: TextTone;
  large?: boolean;
}) {
  const c = useColors();
  return (
    <View
      accessible
      accessibilityLabel={[label, value, caption].filter(Boolean).join(', ')}
      style={[styles.box, { backgroundColor: c.sunken }]}
    >
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant={large ? 'title' : 'heading'} tone={tone} numeric>
        {value}
      </AppText>
      {caption ? (
        <AppText variant="caption" tone="muted">
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexGrow: 1, flexBasis: 120, padding: space.md, borderRadius: radius.md, gap: 2 },
});
