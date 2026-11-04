import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayout } from '@/hooks/useLayout';
import { MAX_CONTENT_WIDTH, space, useColors } from '@/theme';

/** Scrollable screen with a centred, width-limited column (tablets and desktop web). */
export function Screen({
  children,
  onRefresh,
  refreshing = false,
  bottomInset = true,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  bottomInset?: boolean;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { gutter } = useLayout();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{
        paddingHorizontal: gutter,
        paddingTop: space.lg,
        paddingBottom: (bottomInset ? insets.bottom : 0) + space.xxl + 56,
      }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
      }
    >
      <View style={styles.column}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', gap: space.lg },
});
