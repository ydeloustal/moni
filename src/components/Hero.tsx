import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { radius, space, useColors } from '@/theme';
import { dayOfMonth, monthShort, monthOf, type Day } from '@/utils/dates';
import { AppText } from './AppText';

/** Large dark summary card ("Solde actuel", "Épargne totale"…): same look in both modes. */
export function Hero({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return (
    <View style={[styles.hero, { backgroundColor: c.hero, borderColor: c.heroLine }, style]}>
      {children}
    </View>
  );
}

/** Key figure inside a Hero. Read as one sentence by screen readers ("label, value, caption"). */
export function HeroTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: ReactNode;
}) {
  const c = useColors();
  return (
    <View
      accessible
      accessibilityLabel={[label, value, typeof caption === 'string' ? caption : null]
        .filter(Boolean)
        .join(', ')}
      style={[styles.tile, { backgroundColor: c.heroTile }]}
    >
      <AppText variant="caption" tone="heroMuted">
        {label}
      </AppText>
      <AppText variant="title" tone="onHero" numeric>
        {value}
      </AppText>
      {typeof caption === 'string' ? (
        <AppText variant="caption" tone="heroMuted">
          {caption}
        </AppText>
      ) : (
        caption
      )}
    </View>
  );
}

/** Day of the month in a small rounded square ("5 / NOV."). Decorative: rows carry the date in their label. */
export function DayChip({ day, tone = 'default' }: { day: Day; tone?: 'default' | 'warn' }) {
  const c = useColors();
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.day, { backgroundColor: tone === 'warn' ? c.warnBg : c.sunken }]}
    >
      <AppText style={styles.dayNum} numeric>
        {String(dayOfMonth(day))}
      </AppText>
      <AppText style={[styles.dayMonth, { color: c.muted }]}>
        {monthShort(monthOf(day)).toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, borderWidth: 1, padding: space.lg + 4, gap: space.xs },
  tile: { flexGrow: 1, flexBasis: 140, borderRadius: radius.lg - 4, padding: space.md + 2, gap: 2 },
  day: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { fontSize: 15, lineHeight: 17, fontWeight: '800' },
  dayMonth: { fontSize: 9, lineHeight: 11, fontWeight: '700', letterSpacing: 0.4 },
});
