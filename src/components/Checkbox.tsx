import { Pressable, StyleSheet, View } from 'react-native';
import { radius, TOUCH_TARGET, useColors } from '@/theme';
import { Icon } from './Icon';
import type { InteractionState } from './pressable';

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Screen reader label (the visible label is usually next to the box). */
  label: string;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled: !!disabled }}
      style={(state: InteractionState) => [
        styles.hit,
        state.focused ? { borderColor: c.focus } : null,
      ]}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? c.good : c.surface,
            borderColor: checked ? c.good : c.lineStrong,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {checked ? <Icon name="check" size={16} color={c.surface} strokeWidth={2.6} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
