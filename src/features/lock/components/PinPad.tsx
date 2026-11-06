import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon, type IconName } from '@/components';
import type { InteractionState } from '@/components/pressable';
import { radius, space, useColors } from '@/theme';
import { PIN_LENGTH } from '../domain/pin';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

function Key({
  label,
  accessibilityLabel,
  icon,
  onPress,
  disabled,
}: {
  label?: string;
  accessibilityLabel: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={(s: InteractionState) => [
        styles.key,
        {
          backgroundColor: s.pressed || s.hovered ? c.chip : label ? c.surface : 'transparent',
          borderColor: s.focused ? c.focus : label ? c.line : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      {icon ? (
        <Icon name={icon} size={26} color={c.ink} />
      ) : (
        <AppText variant="title">{label}</AppText>
      )}
    </Pressable>
  );
}

/**
 * Digit pad with progress dots. Calls `onComplete` once PIN_LENGTH digits are typed, then clears itself.
 * Physical keyboards work on the web (digits, Backspace).
 */
export function PinPad({
  onComplete,
  onInput,
  disabled,
  busy,
  biometricIcon,
  biometricLabel,
  onBiometric,
}: {
  onComplete: (pin: string) => void;
  /** Called on each key (e.g. to clear an error message). */
  onInput?: () => void;
  disabled?: boolean;
  busy?: boolean;
  biometricIcon?: IconName;
  biometricLabel?: string;
  onBiometric?: () => void;
}) {
  const c = useColors();
  const inactive = disabled || busy;
  const [value, setValue] = useState('');
  // Source of truth for the typed digits: fast typing (several keys before a re-render) loses nothing.
  const typed = useRef('');
  const update = (next: string) => {
    typed.current = next;
    setValue(next);
  };
  const press = (digit: string) => {
    if (inactive || typed.current.length >= PIN_LENGTH) return;
    const next = typed.current + digit;
    onInput?.();
    if (next.length === PIN_LENGTH) {
      update('');
      onComplete(next);
    } else {
      update(next);
    }
  };
  const erase = () => {
    if (inactive) return;
    onInput?.();
    update(typed.current.slice(0, -1));
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') erase();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <View style={styles.wrap}>
      <View
        style={styles.dots}
        accessible
        accessibilityLabel={`${value.length} chiffre${value.length > 1 ? 's' : ''} saisi${value.length > 1 ? 's' : ''} sur ${PIN_LENGTH}`}
        accessibilityLiveRegion="polite"
      >
        {busy ? (
          <ActivityIndicator color={c.ink} accessibilityLabel="Vérification" />
        ) : (
          Array.from({ length: PIN_LENGTH }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { borderColor: c.ink, backgroundColor: i < value.length ? c.ink : 'transparent' },
              ]}
            />
          ))
        )}
      </View>
      <View style={styles.grid}>
        {KEYS.map(k => (
          <Key
            key={k}
            label={k}
            accessibilityLabel={k}
            onPress={() => press(k)}
            disabled={inactive}
          />
        ))}
        {onBiometric && biometricIcon ? (
          <Key
            icon={biometricIcon}
            accessibilityLabel={biometricLabel ?? 'Biométrie'}
            onPress={onBiometric}
            disabled={busy}
          />
        ) : (
          <View style={styles.key} />
        )}
        <Key label="0" accessibilityLabel="0" onPress={() => press('0')} disabled={inactive} />
        <Key
          icon="backspace"
          accessibilityLabel="Effacer le dernier chiffre"
          onPress={erase}
          disabled={inactive || !value}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.xl },
  dots: { flexDirection: 'row', gap: space.md, height: 24, alignItems: 'center' },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  grid: {
    width: 264,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    justifyContent: 'center',
  },
  key: {
    width: 76,
    height: 64,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
