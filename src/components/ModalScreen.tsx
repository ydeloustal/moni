import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayout } from '@/hooks/useLayout';
import { space, useColors } from '@/theme';
import { AppText } from './AppText';
import { IconButton } from './Button';

/** Closes a modal, or goes to `fallback` when the modal was opened directly (web deep link). */
export function closeModal(fallback: '/' | '/operations' | '/savings' | '/settings' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/** Form-style window: title bar with a close button, scrollable body, sticky footer. */
export function ModalScreen({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { gutter } = useLayout();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === 'android' ? insets.top + space.sm : space.sm,
            paddingHorizontal: gutter - space.sm,
            borderBottomColor: c.line,
            backgroundColor: c.surface,
          },
        ]}
      >
        <AppText
          variant="heading"
          accessibilityRole="header"
          style={{ flex: 1, paddingLeft: space.sm }}
          numberOfLines={1}
        >
          {title}
        </AppText>
        <IconButton icon="close" label="Fermer" onPress={onClose} testID="modal-close" />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: gutter, paddingBottom: space.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.column}>{children}</View>
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + space.md,
              paddingHorizontal: gutter,
              borderTopColor: c.line,
              backgroundColor: c.surface,
            },
          ]}
        >
          <View style={[styles.column, styles.footerRow]}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  column: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: space.lg },
  footer: { paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  footerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: space.sm },
});
