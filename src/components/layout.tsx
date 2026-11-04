import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { useLayout } from '@/hooks/useLayout';
import { space, useColors } from '@/theme';

export function Row({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.row, style]} />;
}

export function Stack({ gap = space.md, style, ...props }: ViewProps & { gap?: number }) {
  return <View {...props} style={[{ gap }, style]} />;
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line }} />;
}

/** Responsive grid: 1 column on phones, 2 on tablets, up to `max` on desktop. */
export function Grid({
  children,
  max = 2,
  style,
}: {
  children: ReactNode;
  max?: 1 | 2 | 3;
  style?: ViewStyle;
}) {
  const { columns } = useLayout();
  const n = Math.min(columns, max);
  if (n === 1) return <View style={[{ gap: space.lg }, style]}>{children}</View>;
  return (
    <View style={[styles.grid, style]}>
      {(Array.isArray(children) ? children : [children]).filter(Boolean).map((child, i) => (
        <View key={i} style={{ flexBasis: `${100 / n - 2}%`, flexGrow: 1, minWidth: 280 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, alignItems: 'flex-start' },
});
