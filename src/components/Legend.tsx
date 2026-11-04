import { StyleSheet, View } from 'react-native';
import { space } from '@/theme';
import { AppText } from './AppText';

export function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <View style={styles.row}>
      {items.map(i => (
        <View key={i.label} style={styles.item}>
          <View
            style={[styles.swatch, { backgroundColor: i.color, opacity: i.dashed ? 0.6 : 1 }]}
          />
          <AppText variant="caption" tone="ink2">
            {i.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  swatch: { width: 14, height: 4, borderRadius: 2 },
});
