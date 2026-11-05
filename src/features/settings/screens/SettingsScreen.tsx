import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import {
  AppText,
  Banner,
  Button,
  Card,
  Divider,
  Grid,
  ListRow,
  Row,
  Screen,
  Segmented,
  TextField,
  useConfirm,
} from '@/components';
import { updateSettings } from '@/features/budget/domain/actions';
import { LockSettings } from '@/features/lock/components/LockSettings';
import { commit, useBudget } from '@/hooks/useBudget';
import { useToday } from '@/hooks/useToday';
import {
  clearPreferences,
  DEFAULT_PREFERENCES,
  type ThemePreference,
} from '@/services/preferences/preferences';
import { budgetStore } from '@/services/store/instance';
import { space, useTheme } from '@/theme';
import { dayLongLabel } from '@/utils/dates';
import { centsToInput, formatMoney, parseAmount } from '@/utils/money';
import { AccentPicker } from '../components/AccentPicker';

export function SettingsScreen() {
  const state = useBudget();
  const today = useToday();
  const confirm = useConfirm();
  const { preferences, setPreferences } = useTheme();
  const [buffer, setBuffer] = useState(centsToInput(state.settings.buffer));
  const [bufferError, setBufferError] = useState<string | null>(null);
  const [wiped, setWiped] = useState(false);

  function saveBuffer() {
    const cents = parseAmount(buffer);
    if (Number.isNaN(cents)) {
      setBufferError('Montant illisible, par exemple 50,00.');
      return;
    }
    setBufferError(null);
    commit(s => updateSettings(s, { buffer: cents }), `Marge de sécurité : ${formatMoney(cents)}`);
  }

  async function wipe() {
    const first = await confirm({
      title: 'Effacer toutes mes données ?',
      message:
        'Opérations, livrets, objectifs, catégories et réglages seront définitivement supprimés de cet appareil. Fais une sauvegarde avant si tu veux pouvoir les retrouver.',
      confirmLabel: 'Continuer',
      destructive: true,
    });
    if (!first) return;
    const second = await confirm({
      title: 'Dernière confirmation',
      message: 'Cette action est irréversible.',
      confirmLabel: 'Tout effacer',
      destructive: true,
    });
    if (!second) return;
    await budgetStore.wipe(today);
    await clearPreferences().catch(() => undefined);
    setPreferences(DEFAULT_PREFERENCES);
    setBuffer(centsToInput(budgetStore.getSnapshot().state?.settings.buffer ?? 0));
    setWiped(true);
  }

  return (
    <Screen>
      {wiped ? (
        <Banner tone="good" title="Toutes les données ont été effacées de cet appareil." />
      ) : null}
      <Grid max={2}>
        <View style={{ gap: space.lg }}>
          <Card title="Apparence">
            <Segmented<ThemePreference>
              label="Thème"
              value={preferences.theme}
              onChange={theme => setPreferences({ theme })}
              options={[
                { value: 'system', label: 'Système' },
                { value: 'light', label: 'Clair' },
                { value: 'dark', label: 'Sombre' },
              ]}
            />
            <AccentPicker
              value={preferences.accent}
              onChange={accent => setPreferences({ accent })}
            />
          </Card>
          <LockSettings />
          <Card
            title="Marge de sécurité"
            subtitle="Le plan d’épargne ne fait jamais descendre ton compte courant sous ce montant."
          >
            <TextField
              label="Montant"
              value={buffer}
              onChangeText={v => {
                setBuffer(v);
                setBufferError(null);
              }}
              onSubmitEditing={saveBuffer}
              keyboardType="decimal-pad"
              suffix="€"
              error={bufferError}
            />
            <Row style={{ justifyContent: 'flex-end' }}>
              <Button label="Enregistrer" onPress={saveBuffer} />
            </Row>
          </Card>
        </View>
        <View style={{ gap: space.lg }}>
          <Card title="Mes données">
            <ListRow
              title="Sauvegarder, exporter, importer"
              subtitle={
                state.settings.lastBackupAt
                  ? `Dernière sauvegarde le ${dayLongLabel(state.settings.lastBackupAt)}`
                  : 'Aucune sauvegarde pour l’instant'
              }
              onPress={() => router.push('/backup')}
            />
            <Divider />
            <ListRow title="Catégories" onPress={() => router.push('/categories')} />
            <Divider />
            <ListRow title="Abonnements" onPress={() => router.push('/subscriptions')} />
          </Card>
          <Card title="Informations">
            <ListRow
              title="Confidentialité"
              subtitle="Aucun traceur, aucune connexion"
              onPress={() => router.push('/privacy')}
            />
            <Divider />
            <ListRow
              title="Taux des livrets et leurs sources"
              onPress={() => router.push('/rates')}
            />
          </Card>
          <Card
            title="Effacer toutes mes données"
            subtitle="Supprime tout ce que Moni a enregistré sur cet appareil."
          >
            <Row style={{ justifyContent: 'flex-end' }}>
              <Button
                kind="danger"
                icon="trash"
                label="Effacer toutes mes données"
                onPress={() => void wipe()}
                testID="wipe"
              />
            </Row>
          </Card>
        </View>
      </Grid>
      <AppText variant="caption" tone="muted" align="center">
        {`Moni ${Constants.expoConfig?.version ?? ''} · ${Platform.OS === 'web' ? 'Web' : Platform.OS === 'ios' ? 'iOS' : 'Android'} · Données stockées uniquement sur cet appareil`}
      </AppText>
    </Screen>
  );
}
