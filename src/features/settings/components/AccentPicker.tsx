import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import type { InteractionState } from '@/components/pressable';
import { ACCENT_NAMES, type AccentPreference } from '@/services/preferences/preferences';
import { ACCENTS, radius, space, TOUCH_TARGET, useTheme } from '@/theme';

/** Choice of the menu accent colour: one labelled swatch per colour (radio group). */
export function AccentPicker({
  value,
  onChange,
}: {
  value: AccentPreference;
  onChange: (accent: AccentPreference) => void;
}) {
  const { colors: c, scheme } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      <AppText variant="label" tone="ink2">
        Couleur des menus
      </AppText>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Couleur des menus"
        style={styles.group}
      >
        {ACCENT_NAMES.map(name => {
          const accent = ACCENTS[name];
          const swatch = accent[scheme];
          const selected = name === value;
          return (
            <Pressable
              key={name}
              onPress={() => onChange(name)}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={accent.label}
              testID={`accent-${name}`}
              style={(state: InteractionState) => [
                styles.item,
                {
                  backgroundColor: selected ? swatch.bg : 'transparent',
                  borderColor: state.focused ? c.focus : selected ? swatch.fg : c.line,
                },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: swatch.fg }]}>
                {selected ? (
                  <Icon name="check" size={16} color={c.surface} strokeWidth={2.6} />
                ) : null}
              </View>
              <AppText
                variant="caption"
                weight={selected ? '600' : '400'}
                style={{ color: selected ? swatch.fg : c.ink2 }}
              >
                {accent.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  item: {
    minHeight: TOUCH_TARGET,
    flexBasis: '30%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
