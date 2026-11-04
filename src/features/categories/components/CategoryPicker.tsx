import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components';
import type { InteractionState } from '@/components/pressable';
import type { Category } from '@/types/domain';
import { radius, space, TOUCH_TARGET, useColors } from '@/theme';

export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: readonly Category[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  const c = useColors();
  return (
    <View style={{ gap: space.xs }}>
      <AppText variant="label" tone="ink2">
        Catégorie
      </AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel="Catégorie" style={styles.wrap}>
        {categories.map(cat => {
          const selected = cat.id === value;
          return (
            <Pressable
              key={cat.id}
              onPress={() => onChange(cat.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={`${cat.name}, ${cat.need ? 'besoin' : 'envie'}`}
              style={(state: InteractionState) => [
                styles.chip,
                {
                  backgroundColor: selected ? c.chip : c.surface,
                  borderColor: state.focused ? c.focus : selected ? c.ink : c.lineStrong,
                },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
              <AppText variant="label" tone={selected ? 'ink' : 'ink2'}>
                {cat.name}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: TOUCH_TARGET - 4,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
