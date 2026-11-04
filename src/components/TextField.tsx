import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { fontFamily, radius, space, TOUCH_TARGET, typography, useColors } from '@/theme';
import { AppText } from './AppText';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string | null;
  suffix?: string;
}

export function TextField({
  label,
  hint,
  error,
  suffix,
  onFocus,
  onBlur,
  ...props
}: TextFieldProps) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  const description = [error, hint].filter(Boolean).join('. ');
  return (
    <View style={styles.wrap}>
      <AppText variant="label" tone="ink2" nativeID={`${label}-label`}>
        {label}
      </AppText>
      <View
        style={[
          styles.box,
          {
            backgroundColor: c.surface,
            borderColor: error ? c.bad : focused ? c.focus : c.lineStrong,
          },
        ]}
      >
        <TextInput
          placeholderTextColor={c.muted}
          accessibilityLabel={label}
          accessibilityHint={description || undefined}
          aria-invalid={!!error}
          maxFontSizeMultiplier={2}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
          style={[styles.input, typography.body, { color: c.ink, fontFamily }]}
        />
        {suffix ? (
          <AppText tone="muted" style={{ paddingRight: space.md }}>
            {suffix}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="bad" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: TOUCH_TARGET + 4,
  },
  input: {
    flex: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: TOUCH_TARGET,
    // The surrounding box already shows the focus ring.
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null),
  },
});
