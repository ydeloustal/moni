import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  AppText,
  Banner,
  Button,
  Card,
  closeModal,
  ModalScreen,
  ProgressBar,
  TextField,
  useConfirm,
} from '@/components';
import type { ImportResult } from '@/features/backup/domain/importData';
import { useToday } from '@/hooks/useToday';
import { budgetStore } from '@/services/store/instance';
import { dayLongLabel } from '@/utils/dates';
import { formatMoney } from '@/utils/money';
import { QrScanner } from '../components/QrScanner';
import {
  assemble,
  collect,
  emptyCollector,
  isComplete,
  parseFrame,
  type Collector,
} from '../domain/frames';
import { isCodeComplete, unpackTransfer } from '../domain/payload';

type Step =
  | { kind: 'scan' }
  | { kind: 'code'; text: string }
  | { kind: 'preview'; result: ImportResult }
  | { kind: 'done' };

export function TransferReceiveScreen() {
  const today = useToday();
  const confirm = useConfirm();
  const [step, setStep] = useState<Step>({ kind: 'scan' });
  const [progress, setProgress] = useState<Collector>(emptyCollector);
  const collector = useRef<Collector>(emptyCollector);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const close = () => closeModal('/settings');

  const onScan = useCallback((data: string) => {
    const frame = parseFrame(data);
    if (!frame) return;
    const next = collect(collector.current, frame);
    if (next === collector.current) return; // already had this part
    collector.current = next;
    setProgress(next);
    if (isComplete(next)) setStep({ kind: 'code', text: assemble(next) ?? '' });
  }, []);

  function restart() {
    collector.current = emptyCollector;
    setProgress(emptyCollector);
    setCode('');
    setError(null);
    setStep({ kind: 'scan' });
  }

  async function decrypt(text: string) {
    if (!isCodeComplete(code)) {
      setError('Le code fait 10 caractères (lettres et chiffres), par exemple ABCDE-FGHJK.');
      return;
    }
    setError(null);
    setBusy(0);
    try {
      const result = await unpackTransfer(text, code, today, p => setBusy(p));
      setStep({ kind: 'preview', result });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function replace(result: ImportResult) {
    const ok = await confirm({
      title: 'Remplacer mes données ?',
      message:
        'Toutes les données de cet appareil seront remplacées par celles de l’autre appareil.',
      confirmLabel: 'Remplacer',
      destructive: true,
    });
    if (!ok) return;
    try {
      await budgetStore.replaceAll(result.state);
      setStep({ kind: 'done' });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const pct = progress.total ? Math.round((progress.received / progress.total) * 100) : 0;

  return (
    <ModalScreen title="Recevoir depuis un autre appareil" onClose={close}>
      {step.kind === 'scan' ? (
        <>
          <AppText tone="ink2">
            Sur l’autre appareil, ouvre Moni › Réglages › Sauvegarde › Envoyer, puis vise le QR code
            qui s’affiche.
          </AppText>
          <QrScanner onScan={onScan} />
          {progress.total > 0 ? (
            <Card title={`${progress.received} / ${progress.total} parties reçues`}>
              <ProgressBar value={pct} label={`Réception : ${pct} %`} />
              <AppText variant="caption" tone="muted">
                Garde l’appareil immobile : les parties manquées reviennent au tour suivant.
              </AppText>
            </Card>
          ) : null}
          <Banner tone="info" title="100 % local">
            Aucune connexion : les données arrivent par la caméra, chiffrées. Elles ne sont lisibles
            qu’avec le code affiché sur l’autre appareil.
          </Banner>
        </>
      ) : null}

      {step.kind === 'code' ? (
        <Card
          title="Toutes les parties sont reçues"
          subtitle="Tape le code affiché sur l’autre appareil."
        >
          <TextField
            label="Code"
            value={code}
            onChangeText={v => {
              setCode(v);
              setError(null);
            }}
            onSubmitEditing={() => void decrypt(step.text)}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            placeholder="ABCDE-FGHJK"
            error={error}
            testID="transfer-code-input"
          />
          {busy !== null ? (
            <ProgressBar value={Math.round(busy * 100)} label="Déchiffrement en cours" />
          ) : null}
          <Button
            kind="primary"
            label="Déchiffrer"
            busy={busy !== null}
            onPress={() => void decrypt(step.text)}
            testID="transfer-decrypt"
          />
          <Button kind="ghost" label="Recommencer le scan" onPress={restart} />
        </Card>
      ) : null}

      {step.kind === 'preview' ? (
        <Card title="Contenu reçu">
          <AppText>
            {`${step.result.state.rules.length} ligne(s) récurrente(s), ${step.result.state.txs.length} opération(s), ${step.result.state.savings.length} compte(s) d’épargne, ${step.result.state.goals.length} objectif(s).`}
          </AppText>
          <AppText tone="ink2">
            {`Solde de ${formatMoney(step.result.state.settings.balance)} au ${dayLongLabel(step.result.state.settings.balanceDate)}.`}
          </AppText>
          {step.result.warnings.map(w => (
            <Banner key={w} tone="warn" title="À vérifier">
              {w}
            </Banner>
          ))}
          {error ? (
            <Banner tone="bad" title="Import impossible">
              {error}
            </Banner>
          ) : null}
          <Button
            kind="destructive"
            label="Remplacer mes données"
            onPress={() => void replace(step.result)}
            testID="transfer-replace"
          />
          <Button label="Annuler" onPress={close} />
        </Card>
      ) : null}

      {step.kind === 'done' ? (
        <>
          <Banner tone="good" title="Données transférées">
            Cet appareil est maintenant une copie de l’autre. Pense à garder une sauvegarde
            chiffrée.
          </Banner>
          <Button kind="primary" label="Aller à l’accueil" onPress={() => router.replace('/')} />
        </>
      ) : null}
    </ModalScreen>
  );
}
