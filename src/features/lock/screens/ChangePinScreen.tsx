import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Banner, closeModal, ModalScreen } from '@/components';
import { space } from '@/theme';
import { PinPad } from '../components/PinPad';
import { PinSetup } from '../components/LockScreen';
import { checkPin } from '../services/lockService';

/** Change the PIN: the current one is required first. */
export function ChangePinScreen() {
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => closeModal('/settings');

  async function submit(pin: string) {
    setBusy(true);
    const result = await checkPin(pin);
    setBusy(false);
    if (result.ok) setVerified(true);
    else setError(result.waitMs > 0 ? 'Trop d’essais : réessaie plus tard.' : 'Code incorrect.');
  }

  if (verified) {
    return (
      <ModalScreen title="Nouveau code" onClose={close}>
        <PinSetup title="Choisis un nouveau code" onDone={close} />
      </ModalScreen>
    );
  }
  return (
    <ModalScreen title="Changer le code" onClose={close}>
      <View style={{ gap: space.xl, alignItems: 'center' }}>
        <AppText tone="ink2" align="center">
          Saisis ton code actuel.
        </AppText>
        <PinPad busy={busy} onComplete={pin => void submit(pin)} onInput={() => setError(null)} />
        {error ? <Banner tone="bad" title={error} /> : null}
      </View>
    </ModalScreen>
  );
}
