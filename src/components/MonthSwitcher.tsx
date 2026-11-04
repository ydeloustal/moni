import { StyleSheet, View } from 'react-native';
import { addMonths, monthLabel, type Month } from '@/utils/dates';
import { AppText } from './AppText';
import { IconButton } from './Button';

export function MonthSwitcher({
  month,
  onChange,
  min,
  max,
}: {
  month: Month;
  onChange: (month: Month) => void;
  min?: Month;
  max?: Month;
}) {
  const label = monthLabel(month);
  return (
    <View style={styles.row}>
      <IconButton
        icon="chevronLeft"
        label="Mois précédent"
        disabled={!!min && month <= min}
        onPress={() => onChange(addMonths(month, -1))}
      />
      <AppText
        variant="heading"
        align="center"
        style={styles.label}
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
      >
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </AppText>
      <IconButton
        icon="chevronRight"
        label="Mois suivant"
        disabled={!!max && month >= max}
        onPress={() => onChange(addMonths(month, 1))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1 },
});
