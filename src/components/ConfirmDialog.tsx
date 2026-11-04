/**
 * Cross-platform confirmation dialog (React Native's Alert does not exist on the web).
 * Usage: `const confirm = useConfirm(); if (await confirm({...})) { ... }`
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { radius, space, useColors } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const c = useColors();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>(
    next =>
      new Promise<boolean>(resolve => {
        resolver.current?.(false);
        resolver.current = resolve;
        setOptions(next);
      }),
    [],
  );

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        visible={!!options}
        transparent
        animationType="fade"
        onRequestClose={() => close(false)}
      >
        <View style={[styles.scrim, { backgroundColor: c.scrim }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => close(false)}
            accessibilityLabel="Annuler"
            accessibilityRole="button"
          />
          {options ? (
            <View
              accessibilityViewIsModal
              accessibilityRole="alert"
              style={[styles.dialog, { backgroundColor: c.surface, borderColor: c.line }]}
            >
              <AppText variant="heading" accessibilityRole="header">
                {options.title}
              </AppText>
              {options.message ? <AppText tone="ink2">{options.message}</AppText> : null}
              <View style={styles.actions}>
                <Button label={options.cancelLabel ?? 'Annuler'} onPress={() => close(false)} />
                <Button
                  label={options.confirmLabel ?? 'Confirmer'}
                  kind={options.destructive ? 'danger' : 'primary'}
                  onPress={() => close(true)}
                  testID="confirm-accept"
                />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside ConfirmProvider');
  return confirm;
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  dialog: {
    width: '100%',
    maxWidth: 440,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.xl,
    gap: space.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.sm,
  },
});
