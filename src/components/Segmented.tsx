import { Pressable, StyleSheet, View } from 'react-native';
import { radius, space, TOUCH_TARGET, useColors } from '@/theme';
import { AppText } from './AppText';
import type { InteractionState } from './pressable';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
}

/** Single choice among a few options (radio group semantics). */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  wrap,
}: {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  wrap?: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ gap: space.xs }}>
      <AppText variant="label" tone="ink2">
        {label}
      </AppText>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={[styles.group, { backgroundColor: c.sunken, flexWrap: wrap ? 'wrap' : 'nowrap' }]}
      >
        {options.map(o => {
          const selected = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={o.label}
              style={(state: InteractionState) => [
                styles.item,
                wrap ? null : { flex: 1 },
                {
                  backgroundColor: selected ? c.surface : 'transparent',
                  borderColor: state.focused ? c.focus : selected ? c.lineStrong : 'transparent',
                },
              ]}
            >
              <AppText
                variant="label"
                tone={selected ? 'ink' : 'muted'}
                align="center"
                numberOfLines={1}
              >
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', borderRadius: radius.md, padding: 3, gap: 3 },
  item: {
    minHeight: TOUCH_TARGET - 6,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
