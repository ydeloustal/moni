import { Platform } from 'react-native';
import { AppText, Card, Grid, Screen } from '@/components';

const STORAGE =
  Platform.OS === 'web'
    ? 'Dans l’espace de stockage de ce site, sur ton appareil (IndexedDB). Le navigateur peut l’effacer (nettoyage, navigation privée, manque d’espace) : sauvegarde régulièrement.'
    : 'Dans l’espace privé de l’application sur ton appareil (base SQLite), chiffré par le système si ton appareil a un code de verrouillage. Les données peuvent être incluses dans la sauvegarde du téléphone (iCloud / Google) selon tes réglages.';

export function PrivacyScreen() {
  return (
    <Screen>
      <Grid max={2}>
        <Card title="En bref">
          <AppText>
            Moni ne collecte aucune donnée. Il n’y a ni compte, ni serveur, ni publicité, ni mesure
            d’audience, ni rapport de plantage.
          </AppText>
        </Card>
        <Card title="Connexions réseau">
          <AppText weight="600">Aucune.</AppText>
          <AppText tone="ink2">
            L’application ne contacte aucun serveur : pas de mise à jour à distance, pas de
            téléchargement de taux, pas de polices ni d’images externes.
            {Platform.OS === 'web'
              ? ' La version web fonctionne hors ligne une fois chargée.'
              : ' Sur Android, la permission Internet n’est même pas demandée.'}
          </AppText>
        </Card>
        <Card title="Où sont mes données ?">
          <AppText tone="ink2">{STORAGE}</AppText>
        </Card>
        <Card title="Sauvegardes et exports">
          <AppText tone="ink2">
            Les sauvegardes .moni sont chiffrées avec ta phrase de passe. Les exports JSON et CSV ne
            le sont pas : garde-les en lieu sûr. Ces fichiers ne quittent ton appareil que si tu les
            partages toi-même.
          </AppText>
        </Card>
        <Card title="Effacer mes données">
          <AppText tone="ink2">
            Réglages → « Effacer toutes mes données », ou désinstalle l’application. L’éditeur ne
            détient aucune donnée te concernant.
          </AppText>
        </Card>
        <Card title="Repères financiers">
          <AppText tone="ink2">
            Les repères affichés (50/30/20, épargne de précaution…) sont des informations générales,
            jamais un conseil en investissement.
          </AppText>
        </Card>
        <Card title="Mentions légales">
          <AppText tone="ink2">
            Éditeur : Yoan Deloustal (particulier), directeur de la publication.
          </AppText>
          <AppText tone="ink2" selectable>
            Contact : yoandeloustal45@gmail.com
          </AppText>
          <AppText tone="ink2">
            Code source sous licence PolyForm Noncommercial 1.0.0 : utilisation, modification et
            partage libres à des fins non commerciales ; tout usage commercial nécessite l’accord de
            l’éditeur. L’application est fournie en l’état, sans garantie. Droit français.
          </AppText>
        </Card>
      </Grid>
    </Screen>
  );
}
