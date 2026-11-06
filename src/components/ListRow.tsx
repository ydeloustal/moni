import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { space, TOUCH_TARGET, useColors } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import type { InteractionState } from './pressable';

export function ListRow({
  title,
  subtitle,
  left,
  right,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const c = useColors();
  const content = (
    <>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText numberOfLines={2}>{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {onPress ? <Icon name="chevronRight" size={18} color={c.muted} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      style={(state: InteractionState) => [
        styles.row,
        {
          backgroundColor: state.pressed || state.hovered ? c.sunken : 'transparent',
          borderColor: state.focused ? c.focus : 'transparent',
        },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: TOUCH_TARGET + 8,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
});
