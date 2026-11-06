import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  AppText,
  Banner,
  Button,
  Card,
  closeModal,
  ModalScreen,
  ProgressBar,
  Row,
} from '@/components';
import { useBudget } from '@/hooks/useBudget';
import { radius, space, useColors } from '@/theme';
import { randomBytes } from '@/utils/random';
import { QrCode } from '../components/QrCode';
import { toFrames } from '../domain/frames';
import { formatCode, newSessionId, newTransferCode, packTransfer } from '../domain/payload';

/** Time each QR code stays on screen: long enough for a phone camera to focus. */
const FRAME_MS = 280;

type Step =
  | { kind: 'preparing'; progress: number }
  | { kind: 'ready'; code: string; frames: string[] }
  | { kind: 'error'; message: string };

export function TransferSendScreen() {
  const state = useBudget();
  const c = useColors();
  const { width, height } = useWindowDimensions();
  const [step, setStep] = useState<Step>({ kind: 'preparing', progress: 0 });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const close = () => closeModal('/settings');

  // The snapshot is taken once: changes made meanwhile are not part of this transfer.
  const [snapshot] = useState(state);
  useEffect(() => {
    let alive = true;
    const code = newTransferCode(randomBytes);
    packTransfer(snapshot, code, randomBytes, {
      onProgress: p => alive && setStep({ kind: 'preparing', progress: p }),
    })
      .then(text => {
        if (alive)
          setStep({ kind: 'ready', code, frames: toFrames(text, newSessionId(randomBytes)) });
      })
      .catch(e => alive && setStep({ kind: 'error', message: (e as Error).message }));
    return () => {
      alive = false;
    };
  }, [snapshot]);

  const total = step.kind === 'ready' ? step.frames.length : 0;
  useEffect(() => {
    if (step.kind !== 'ready' || paused || total < 2) return;
    const timer = setInterval(() => setIndex(i => (i + 1) % total), FRAME_MS);
    return () => clearInterval(timer);
  }, [step.kind, paused, total]);

  const size = Math.max(220, Math.min(width - 64, height - 360, 420));
  const seconds = useMemo(() => Math.ceil((total * FRAME_MS) / 1000), [total]);

  return (
    <ModalScreen
      title="Envoyer vers un autre appareil"
      onClose={close}
      footer={<Button kind="primary" label="Terminer" onPress={close} style={{ flexGrow: 1 }} />}
    >
      {step.kind === 'preparing' ? (
        <Card title="Préparation du transfert">
          <AppText tone="ink2">
            Tes données sont compressées puis chiffrées sur cet appareil.
          </AppText>
          <ProgressBar
            value={Math.round(step.progress * 100)}
            label={`Chiffrement : ${Math.round(step.progress * 100)} %`}
          />
        </Card>
      ) : null}

      {step.kind === 'error' ? (
        <Banner tone="bad" title="Transfert impossible">
          {step.message}
        </Banner>
      ) : null}

      {step.kind === 'ready' ? (
        <>
          <View style={[styles.code, { backgroundColor: c.hero }]}>
            <AppText variant="caption" tone="heroMuted" align="center">
              Code à taper sur l’autre appareil
            </AppText>
            <AppText
              tone="onHero"
              align="center"
              selectable
              accessibilityLabel={`Code : ${step.code.split('').join(' ')}`}
              style={styles.codeText}
              testID="transfer-code"
            >
              {formatCode(step.code)}
            </AppText>
          </View>

          <View style={[styles.qr, { borderColor: c.line }]}>
            <QrCode
              value={step.frames[index] ?? ''}
              size={size}
              label={`QR code de transfert, partie ${index + 1} sur ${total}`}
            />
          </View>
          <Row style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <AppText tone="muted" numeric accessibilityLiveRegion="none">
              {`Partie ${index + 1} / ${total}${total > 1 ? ` · un tour ≈ ${seconds} s` : ''}`}
            </AppText>
            {total > 1 ? (
              <Button
                small
                label={paused ? 'Reprendre' : 'Pause'}
                onPress={() => setPaused(p => !p)}
              />
            ) : null}
          </Row>

          <Card title="Sur l’autre appareil">
            <AppText tone="ink2">
              1. Ouvre Moni › Réglages › Sauvegarde › Recevoir (ou « J’ai déjà Moni » au premier
              lancement).
            </AppText>
            <AppText tone="ink2">
              2. Vise ce QR code et garde cet écran allumé jusqu’à 100 %. L’ordre n’a pas
              d’importance : les parties manquées reviennent au tour suivant.
            </AppText>
            <AppText tone="ink2">3. Tape le code ci-dessus.</AppText>
          </Card>

          <Banner tone="info" title="100 % local">
            Rien ne passe par Internet : les données voyagent par la lumière de l’écran, chiffrées.
            Sans le code, les QR codes sont illisibles. Ne le montre à personne d’autre.
          </Banner>
          <Button
            kind="ghost"
            label="Pas de caméra ? Passer par un fichier chiffré"
            onPress={() => router.push('/backup')}
          />
        </>
      ) : null}
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  code: { borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  codeText: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: 3,
    fontVariant: ['tabular-nums'],
  },
  qr: {
    alignSelf: 'center',
    padding: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
});
