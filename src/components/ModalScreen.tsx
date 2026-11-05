import { router } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayout } from '@/hooks/useLayout';
import { radius, space, useColors } from '@/theme';
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
  const { gutter, dialogModals } = useLayout();

  // Web dialog: Escape closes it, like any desktop window.
  useEffect(() => {
    if (!dialogModals || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Capture phase: a focused text field would otherwise swallow the key.
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [dialogModals, onClose]);

  const panel = (
    <KeyboardAvoidingView
      style={
        dialogModals
          ? [styles.dialog, { backgroundColor: c.bg, borderColor: c.line }]
          : { flex: 1, backgroundColor: c.bg }
      }
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      accessibilityViewIsModal
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
        // In a dialog the height follows the content, up to the window height.
        style={dialogModals ? { flexGrow: 0, flexShrink: 1 } : { flex: 1 }}
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

  if (!dialogModals) return panel;
  return (
    <View style={[styles.backdrop, { backgroundColor: c.scrim }]}>
      {/* Clicking outside the dialog closes it; the close button stays the accessible way. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessible={false}
        importantForAccessibility="no"
      />
      {panel}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  dialog: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 20px 48px rgba(15, 18, 23, 0.25)',
  },
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
