import { router } from 'expo-router';
import { useState } from 'react';
import {
  AppText,
  Banner,
  Button,
  Card,
  closeModal,
  ModalScreen,
  ProgressBar,
  Row,
  TextField,
} from '@/components';
import { updateSettings } from '@/features/budget/domain/actions';
import { commit, useBudget } from '@/hooks/useBudget';
import { useToday } from '@/hooks/useToday';
import { dayLongLabel } from '@/utils/dates';
import { RestoreFlow } from '../components/RestoreFlow';
import { isPassphraseLongEnough, MIN_PASSPHRASE } from '../domain/crypto';
import { exportCsv, exportEncryptedBackup, exportJson } from '../services/backupService';

export function BackupScreen() {
  const state = useBudget();
  const today = useToday();
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
  const close = () => closeModal('/settings');

  const tooShort = passphrase.length > 0 && !isPassphraseLongEnough(passphrase);
  const mismatch = confirmation.length > 0 && confirmation !== passphrase;

  async function createBackup() {
    if (!isPassphraseLongEnough(passphrase) || passphrase !== confirmation) return;
    setBusy(true);
    setMessage(null);
    setProgress(0);
    try {
      await exportEncryptedBackup(state, passphrase, today, setProgress);
      commit(s => updateSettings(s, { lastBackupAt: today }));
      setPassphrase('');
      setConfirmation('');
      setMessage({
        tone: 'good',
        text: 'Sauvegarde chiffrée créée. Range-la hors de cet appareil.',
      });
    } catch (e) {
      setMessage({ tone: 'bad', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function run(task: () => Promise<void>) {
    setMessage(null);
    try {
      await task();
    } catch (e) {
      setMessage({ tone: 'bad', text: (e as Error).message });
    }
  }

  return (
    <ModalScreen title="Sauvegarder, exporter, importer" onClose={close}>
      {message ? <Banner tone={message.tone} title={message.text} /> : null}

      <Card
        title="Transférer vers un autre appareil"
        subtitle="Téléphone ↔ téléphone ↔ ordinateur, par QR code animé. 100 % local : aucun serveur, aucune connexion."
      >
        <Row style={{ flexWrap: 'wrap' }}>
          <Button
            kind="primary"
            icon="upload"
            label="Envoyer"
            onPress={() => router.push('/transfer-send')}
            testID="transfer-send"
          />
          <Button
            icon="download"
            label="Recevoir"
            onPress={() => router.push('/transfer-receive')}
            testID="transfer-receive"
          />
        </Row>
      </Card>

      <Card
        title="Sauvegarde chiffrée (.moni)"
        subtitle={
          state.settings.lastBackupAt
            ? `Dernière sauvegarde le ${dayLongLabel(state.settings.lastBackupAt)}.`
            : 'Aucune sauvegarde pour l’instant.'
        }
      >
        <AppText tone="ink2">
          Le fichier est chiffré avec ta phrase de passe (Argon2id + XChaCha20-Poly1305).
          Enregistre-le hors de cet appareil : cloud, clé USB, e-mail à toi-même.
        </AppText>
        <Banner tone="warn" title="Phrase de passe perdue = sauvegarde irrécupérable">
          Personne ne la connaît à part toi : ni Moni, ni aucun serveur.
        </Banner>
        <TextField
          label="Phrase de passe"
          value={passphrase}
          onChangeText={setPassphrase}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          hint={`Au moins ${MIN_PASSPHRASE} caractères. Une phrase de plusieurs mots est plus sûre et plus facile à retenir.`}
          error={tooShort ? `Au moins ${MIN_PASSPHRASE} caractères.` : null}
          testID="backup-passphrase"
        />
        <TextField
          label="Confirmer la phrase de passe"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          error={mismatch ? 'Les deux phrases ne sont pas identiques.' : null}
          testID="backup-confirmation"
        />
        {busy ? <ProgressBar value={progress * 100} label="Chiffrement en cours" /> : null}
        <Row style={{ justifyContent: 'flex-end' }}>
          <Button
            kind="primary"
            icon="lock"
            label="Créer la sauvegarde chiffrée"
            busy={busy}
            disabled={!isPassphraseLongEnough(passphrase) || passphrase !== confirmation}
            onPress={() => void createBackup()}
            testID="backup-create"
          />
        </Row>
      </Card>

      <Card
        title="Exports ouverts"
        subtitle="Lisibles par n’importe quel logiciel, donc NON chiffrés."
      >
        <AppText tone="ink2">
          JSON : toutes les données (migration, archivage). CSV : les opérations, pour un tableur.
        </AppText>
        <Row style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button
            icon="download"
            label="Export JSON"
            onPress={() => void run(() => exportJson(state, today))}
          />
          <Button
            icon="download"
            label="Export CSV"
            onPress={() => void run(() => exportCsv(state, today))}
          />
        </Row>
      </Card>

      <Card
        title="Importer"
        subtitle="Sauvegarde Moni (.moni), export JSON, ou export de l’ancienne version de Moni."
      >
        <AppText tone="ink2">
          Les données actuelles ne sont remplacées qu’après un aperçu et ta confirmation.
        </AppText>
        <RestoreFlow />
      </Card>
    </ModalScreen>
  );
}
