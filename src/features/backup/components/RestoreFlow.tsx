import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Banner, Button, ProgressBar, Row, TextField, useConfirm } from '@/components';
import { useToday } from '@/hooks/useToday';
import { pickTextFile } from '@/services/files/files';
import { budgetStore } from '@/services/store/instance';
import { space } from '@/theme';
import { formatMoney } from '@/utils/money';
import { dayLongLabel } from '@/utils/dates';
import type { EncryptedEnvelope } from '../domain/crypto';
import type { ImportResult } from '../domain/importData';
import { decryptImport, readImportFile } from '../services/backupService';

type Step =
  | { kind: 'idle' }
  | { kind: 'passphrase'; envelope: EncryptedEnvelope }
  | { kind: 'preview'; result: ImportResult };

/** Import: choose a file → passphrase if encrypted → preview → confirmation → replace. */
export function RestoreFlow({ onDone }: { onDone?: () => void }) {
  const today = useToday();
  const confirm = useConfirm();
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  async function choose() {
    setError(null);
    setDone(false);
    try {
      const text = await pickTextFile();
      if (text === null) return;
      const next = readImportFile(text, today);
      setStep(
        next.kind === 'encrypted'
          ? { kind: 'passphrase', envelope: next.envelope }
          : { kind: 'preview', result: next.result },
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function decrypt(envelope: EncryptedEnvelope) {
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const result = await decryptImport(envelope, passphrase, today, setProgress);
      setPassphrase('');
      setStep({ kind: 'preview', result });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function replace(result: ImportResult) {
    const ok = await confirm({
      title: 'Remplacer mes données ?',
      message:
        'Toutes les données actuelles de cet appareil seront remplacées par celles du fichier.',
      confirmLabel: 'Remplacer',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await budgetStore.replaceAll(result.state);
      setStep({ kind: 'idle' });
      setDone(true);
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.md }}>
      {error ? (
        <Banner tone="bad" title="Import impossible">
          {error}
        </Banner>
      ) : null}
      {done ? (
        <Banner tone="good" title="Données restaurées">
          Pense à vérifier ton solde.
        </Banner>
      ) : null}

      {step.kind === 'idle' ? (
        <Button
          icon="upload"
          label="Choisir un fichier"
          onPress={() => void choose()}
          testID="import-choose"
        />
      ) : null}

      {step.kind === 'passphrase' ? (
        <View style={{ gap: space.md }}>
          <TextField
            label="Phrase de passe de la sauvegarde"
            value={passphrase}
            onChangeText={setPassphrase}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            onSubmitEditing={() => void decrypt(step.envelope)}
          />
          {busy ? <ProgressBar value={progress * 100} label="Déchiffrement en cours" /> : null}
          <Row style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button label="Annuler" onPress={() => setStep({ kind: 'idle' })} disabled={busy} />
            <Button
              kind="primary"
              label="Déchiffrer"
              busy={busy}
              disabled={passphrase.length === 0}
              onPress={() => void decrypt(step.envelope)}
            />
          </Row>
        </View>
      ) : null}

      {step.kind === 'preview' ? (
        <View style={{ gap: space.md }}>
          <AppText variant="heading">Contenu du fichier</AppText>
          <AppText tone="ink2">
            {step.result.source === 'legacy-php' ? 'Export de l’ancienne version de Moni. ' : ''}
            {step.result.state.rules.length} ligne(s) récurrente(s), {step.result.state.txs.length}{' '}
            opération(s), {step.result.state.savings.length} compte(s) d’épargne,{' '}
            {step.result.state.goals.length} objectif(s).
          </AppText>
          <AppText tone="ink2">
            Solde de {formatMoney(step.result.state.settings.balance)} au{' '}
            {dayLongLabel(step.result.state.settings.balanceDate)}.
          </AppText>
          {step.result.warnings.map(w => (
            <Banner key={w} tone="warn" title="À vérifier">
              {w}
            </Banner>
          ))}
          <Row style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button label="Annuler" onPress={() => setStep({ kind: 'idle' })} disabled={busy} />
            <Button
              kind="danger"
              label="Remplacer mes données"
              busy={busy}
              onPress={() => void replace(step.result)}
              testID="import-replace"
            />
          </Row>
        </View>
      ) : null}
    </View>
  );
}
