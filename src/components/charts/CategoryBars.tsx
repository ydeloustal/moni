import { StyleSheet, View } from 'react-native';
import type { Category } from '@/types/domain';
import { formatMoney, type Cents } from '@/utils/money';
import { radius, space, useColors } from '@/theme';
import { AppText } from '../AppText';

/** Horizontal bars by category: readable as text, accessible without the graphics. */
export function CategoryBars({ rows }: { rows: { category: Category; amount: Cents }[] }) {
  const c = useColors();
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const max = Math.max(1, ...rows.map(r => r.amount));
  return (
    <View style={{ gap: space.md }}>
      {rows.map(r => {
        const share = total ? Math.round((r.amount / total) * 100) : 0;
        return (
          <View
            key={r.category.id}
            accessible
            accessibilityLabel={`${r.category.name} : ${formatMoney(r.amount)}, ${share} %`}
            style={{ gap: space.xs }}
          >
            <View style={styles.row}>
              <View style={[styles.dot, { backgroundColor: r.category.color }]} />
              <AppText style={{ flex: 1 }} numberOfLines={1}>
                {r.category.name}
              </AppText>
              <AppText numeric weight="600">
                {formatMoney(r.amount)}
              </AppText>
              <AppText variant="caption" tone="muted" numeric style={{ width: 40 }} align="right">
                {share} %
              </AppText>
            </View>
            <View style={[styles.track, { backgroundColor: c.sunken }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${(r.amount / max) * 100}%`, backgroundColor: r.category.color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
