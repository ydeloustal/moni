import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { radius, space, useColors } from '@/theme';
import { AppText } from './AppText';

export function Card({
  title,
  subtitle,
  right,
  children,
  style,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
  style?: ViewStyle;
}) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>
      {title || right ? (
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 2 }}>
            {title ? (
              <AppText variant="heading" accessibilityRole="header">
                {title}
              </AppText>
            ) : null}
            {subtitle ? (
              <AppText variant="caption" tone="muted">
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg + 2, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
