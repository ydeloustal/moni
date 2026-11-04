import { StyleSheet, View } from 'react-native';
import { radius, useColors } from '@/theme';

export function ProgressBar({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color?: string;
}) {
  const c = useColors();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={[styles.track, { backgroundColor: c.sunken }]}
    >
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color ?? c.save }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
