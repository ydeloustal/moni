import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStoreSnapshot } from '@/hooks/useBudget';
import { budgetStore } from '@/services/store/instance';
import { radius, space, useColors } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';

const VISIBLE_MS = 7000;

/** "Change saved — Undo" bar, shown after an add, edit or delete. */
export function UndoSnackbar({ bottomOffset = 0 }: { bottomOffset?: number }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { undo } = useStoreSnapshot();

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => budgetStore.dismissUndo(), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  if (!undo) return null;
  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + bottomOffset + space.md }]}
    >
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.bar, { backgroundColor: c.primary }]}
      >
        <AppText tone="onPrimary" style={{ flex: 1 }}>
          {undo.label}
        </AppText>
        <Button
          small
          kind="secondary"
          label="Annuler"
          accessibilityLabel={`Annuler : ${undo.label}`}
          onPress={() => budgetStore.undo()}
          testID="undo"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    width: '100%',
    maxWidth: 560,
    paddingVertical: space.sm,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    borderRadius: radius.md,
  },
});
