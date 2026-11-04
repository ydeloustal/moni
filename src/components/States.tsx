import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { space, useColors } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  const c = useColors();
  return (
    <View style={[styles.full, { backgroundColor: c.bg }]} accessibilityLiveRegion="polite">
      <ActivityIndicator color={c.ink} size="large" accessibilityLabel={label} />
      <AppText tone="muted">{label}</AppText>
    </View>
  );
}

export function EmptyState({
  icon = 'info',
  title,
  children,
  action,
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  action?: { label: string; onPress: () => void };
}) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={28} color={c.muted} />
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {children ? (
        <AppText tone="muted" align="center">
          {children}
        </AppText>
      ) : null}
      {action ? (
        <Button label={action.label} onPress={action.onPress} kind="primary" icon="plus" />
      ) : null}
    </View>
  );
}

export function ErrorState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
}) {
  const c = useColors();
  return (
    <View style={styles.empty} accessibilityRole="alert">
      <Icon name="alert" size={28} color={c.bad} />
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText tone="ink2" align="center">
        {message}
      </AppText>
      {action ? <Button label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  empty: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
  },
});
