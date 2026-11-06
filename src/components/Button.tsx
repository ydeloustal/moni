import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { radius, space, TOUCH_TARGET, useColors } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import type { InteractionState } from './pressable';

export type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  small?: boolean;
  disabled?: boolean;
  busy?: boolean;
  /** Screen reader label when it differs from the visible label. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  label,
  onPress,
  kind = 'secondary',
  icon,
  small,
  disabled,
  busy,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const c = useColors();
  const palette = {
    primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
    secondary: { bg: c.surface, fg: c.ink, border: c.lineStrong },
    ghost: { bg: 'transparent', fg: c.link, border: 'transparent' },
    danger: { bg: c.badBg, fg: c.bad, border: c.badLine },
    destructive: { bg: c.bad, fg: c.onPrimary, border: c.bad },
  }[kind];
  const inactive = disabled || busy;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      hitSlop={small ? 4 : 0}
      style={(state: InteractionState) => [
        styles.base,
        {
          minHeight: small ? 36 : TOUCH_TARGET,
          paddingHorizontal: small ? space.md : space.lg,
          backgroundColor: palette.bg,
          borderColor: state.focused ? c.focus : palette.border,
          opacity: inactive ? 0.5 : state.pressed ? 0.75 : 1,
        },
        state.hovered && !inactive ? { opacity: 0.88 } : null,
        style,
      ]}
    >
      <View style={styles.content}>
        {busy ? (
          <ActivityIndicator size="small" color={palette.fg} />
        ) : icon ? (
          <Icon name={icon} size={small ? 16 : 18} color={palette.fg} />
        ) : null}
        <AppText variant="label" style={{ color: palette.fg }} numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color,
  disabled,
  testID,
}: {
  icon: IconName;
  /** Required: an icon alone has no visible text for screen readers. */
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  testID?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={(state: InteractionState) => [
        styles.icon,
        {
          backgroundColor: state.hovered || state.pressed ? c.chip : 'transparent',
          borderColor: state.focused ? c.focus : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Icon name={icon} size={22} color={color ?? c.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  icon: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radius.pill,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
