import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, View } from 'react-native';
import { LoadingState } from '@/components';
import { useColors } from '@/theme';
import { shouldRelock } from '../domain/pin';
import { biometricKind, type BiometricKind } from '../services/biometrics';
import { hasPin, isBiometricsEnabled } from '../services/lockService';
import { PinSetup, PinUnlock } from './LockScreen';

type Phase = 'checking' | 'setup' | 'locked' | 'unlocked';

interface LockState {
  phase: 'setup' | 'locked';
  biometric: BiometricKind | null;
}

async function readLockState(): Promise<LockState> {
  const [pin, kind, enabled] = await Promise.all([
    hasPin(),
    biometricKind(),
    isBiometricsEnabled(),
  ]);
  return { phase: pin ? 'locked' : 'setup', biometric: enabled ? kind : null };
}

/**
 * Nothing of the app is rendered until it is unlocked: no budget data in the view tree, the accessibility tree
 * or the app switcher snapshot. Re-locks after a minute in the background.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const c = useColors();
  const [phase, setPhase] = useState<Phase>('checking');
  const [biometric, setBiometric] = useState<BiometricKind | null>(null);
  const [unlockId, setUnlockId] = useState(0);
  const backgroundedAt = useRef<number | null>(null);

  const apply = useCallback((state: LockState) => {
    setBiometric(state.biometric);
    setPhase(state.phase);
    setUnlockId(n => n + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    void readLockState().then(state => {
      if (alive) apply(state);
    });
    return () => {
      alive = false;
    };
  }, [apply]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        if (shouldRelock(backgroundedAt.current, Date.now())) void readLockState().then(apply);
        backgroundedAt.current = null;
      } else if (backgroundedAt.current === null) {
        backgroundedAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [apply]);

  if (phase === 'unlocked') return <>{children}</>;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {phase === 'checking' ? <LoadingState label="Verrouillage…" /> : null}
      {phase === 'setup' ? <PinSetup onDone={() => setPhase('unlocked')} /> : null}
      {phase === 'locked' ? (
        <PinUnlock
          key={unlockId}
          biometric={biometric}
          autoBiometric
          onUnlocked={() => {
            // "Forgotten PIN" erases the PIN: check again instead of opening.
            void hasPin().then(pin => setPhase(pin ? 'unlocked' : 'setup'));
          }}
        />
      ) : null}
    </View>
  );
}
