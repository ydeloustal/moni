import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Banner, Button, useConfirm, type IconName } from '@/components';
import { clearPreferences } from '@/services/preferences/preferences';
import { budgetStore } from '@/services/store/instance';
import { space, useColors } from '@/theme';
import { PIN_LENGTH, pinFormatError } from '../domain/pin';
import { authenticateWithBiometrics, type BiometricKind } from '../services/biometrics';
import { PinPad } from './PinPad';
import { checkPin, clearLock, getThrottle, setPin } from '../services/lockService';

const BIOMETRIC: Record<BiometricKind, { icon: IconName; label: string }> = {
  face: { icon: 'shield', label: 'Déverrouiller avec Face ID / reconnaissance faciale' },
  fingerprint: { icon: 'shield', label: 'Déverrouiller avec l’empreinte digitale' },
  iris: { icon: 'shield', label: 'Déverrouiller avec l’iris' },
  generic: { icon: 'shield', label: 'Déverrouiller avec la biométrie' },
};

function formatWait(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return s >= 60 ? `${Math.ceil(s / 60)} min` : `${s} s`;
}

function Frame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[
        styles.frame,
        { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <AppText variant="title" align="center" accessibilityRole="header">
          {title}
        </AppText>
        <AppText tone="ink2" align="center">
          {subtitle}
        </AppText>
      </View>
      {children}
    </ScrollView>
  );
}

/** First launch: mandatory PIN creation (entered twice). */
export function PinSetup({
  onDone,
  title = 'Crée ton code',
}: {
  onDone: () => void;
  title?: string;
}) {
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(
    async (pin: string) => {
      if (first === null) {
        const problem = pinFormatError(pin);
        if (problem) {
          setError(problem);
          return;
        }
        setFirst(pin);
        setError(null);
        return;
      }
      if (pin !== first) {
        setError('Les deux codes sont différents. Recommence.');
        setFirst(null);
        return;
      }
      setBusy(true);
      try {
        await setPin(pin);
        onDone();
      } catch (e) {
        setError((e as Error).message);
        setFirst(null);
      } finally {
        setBusy(false);
      }
    },
    [first, onDone],
  );

  return (
    <Frame
      title={first === null ? title : 'Confirme ton code'}
      subtitle={
        first === null
          ? `Choisis un code à ${PIN_LENGTH} chiffres. Il protège l’accès à Moni sur cet appareil.`
          : 'Saisis le même code une seconde fois.'
      }
    >
      <PinPad onComplete={pin => void submit(pin)} onInput={() => setError(null)} busy={busy} />
      {error ? <Banner tone="bad" title={error} /> : null}
      {first === null ? (
        <AppText variant="caption" tone="muted" align="center">
          Retiens-le bien : sans serveur, un code oublié ne peut pas être récupéré. Il faudrait
          effacer les données de l’appareil et restaurer une sauvegarde.
        </AppText>
      ) : null}
    </Frame>
  );
}

/** Unlock with the PIN, or biometrics when available and enabled. */
export function PinUnlock({
  onUnlocked,
  biometric,
  autoBiometric,
}: {
  onUnlocked: () => void;
  biometric: BiometricKind | null;
  autoBiometric: boolean;
}) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const triedBiometric = useRef(false);
  const waiting = waitUntil > now;

  useEffect(() => {
    void getThrottle().then(t => setWaitUntil(t.lockedUntil));
  }, []);

  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waiting]);

  const biometricUnlock = useCallback(async () => {
    if (await authenticateWithBiometrics()) onUnlocked();
  }, [onUnlocked]);

  useEffect(() => {
    if (biometric && autoBiometric && !triedBiometric.current) {
      triedBiometric.current = true;
      void biometricUnlock();
    }
  }, [biometric, autoBiometric, biometricUnlock]);

  const submit = useCallback(
    async (pin: string) => {
      setBusy(true);
      const result = await checkPin(pin);
      setBusy(false);
      if (result.ok) {
        onUnlocked();
        return;
      }
      setNow(Date.now());
      setWaitUntil(Date.now() + result.waitMs);
      setError(
        result.waitMs > 0
          ? `Trop d’essais : réessaie dans ${formatWait(result.waitMs)}.`
          : `Code incorrect (${result.failures} essai${result.failures > 1 ? 's' : ''}).`,
      );
    },
    [onUnlocked],
  );

  async function forgotten() {
    const ok = await confirm({
      title: 'Code oublié ?',
      message:
        'Le code ne peut pas être récupéré. Tu peux effacer toutes les données de cet appareil, créer un nouveau code, puis restaurer une sauvegarde .moni depuis les Réglages.',
      confirmLabel: 'Tout effacer',
      destructive: true,
    });
    if (!ok) return;
    await budgetStore.wipe();
    await clearPreferences().catch(() => undefined);
    await clearLock();
    onUnlocked(); // the gate sees that no PIN exists anymore and asks for a new one
  }

  const b = biometric ? BIOMETRIC[biometric] : null;
  return (
    <Frame
      title="Moni est verrouillé"
      subtitle={b ? 'Saisis ton code ou utilise la biométrie.' : 'Saisis ton code.'}
    >
      <PinPad
        onComplete={pin => void submit(pin)}
        onInput={() => setError(null)}
        disabled={waiting}
        busy={busy}
        biometricIcon={b?.icon}
        biometricLabel={b?.label}
        onBiometric={b ? () => void biometricUnlock() : undefined}
      />
      {waiting ? (
        <Banner tone="warn" title={`Réessaie dans ${formatWait(waitUntil - now)}`} />
      ) : error ? (
        <Banner tone="bad" title={error} />
      ) : null}
      <Button kind="ghost" label="Code oublié ?" onPress={() => void forgotten()} />
    </Frame>
  );
}

const styles = StyleSheet.create({
  frame: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xl,
    paddingHorizontal: space.lg,
  },
  header: { gap: space.sm, maxWidth: 420 },
});
