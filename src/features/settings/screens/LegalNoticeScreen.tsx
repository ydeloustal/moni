import { AppText, Card, Grid, Screen } from '@/components';

/** Legal notice (mentions légales). Keep in sync with docs/LEGAL_NOTICE.md. */
export function LegalNoticeScreen() {
  return (
    <Screen>
      <Grid max={2}>
        <Card title="Éditeur">
          <AppText>
            Moni est éditée par Yoan Deloustal, à titre non professionnel (particulier).
          </AppText>
          <AppText tone="ink2" selectable>
            Contact : yoandeloustal45@gmail.com
          </AppText>
          <AppText tone="ink2">Directeur de la publication : Yoan Deloustal.</AppText>
        </Card>
        <Card title="Hébergement">
          <AppText tone="ink2">
            Les applications Android et iOS sont distribuées par Google Play (Google Ireland
            Limited, Gordon House, Barrow Street, Dublin 4, Irlande) et l’App Store (Apple
            Distribution International Ltd., Hollyhill Industrial Estate, Hollyhill, Cork, Irlande).
          </AppText>
          <AppText tone="ink2">
            Une fois installée, l’application fonctionne entièrement sur ton appareil : aucune
            donnée de budget n’est hébergée par l’éditeur.
          </AppText>
        </Card>
        <Card title="Licence et propriété intellectuelle">
          <AppText tone="ink2">
            Le code source de Moni est publié sous la licence PolyForm Noncommercial 1.0.0 : il peut
            être lu, utilisé, modifié et partagé à des fins non commerciales. Toute utilisation
            commerciale nécessite l’accord écrit préalable de l’éditeur.
          </AppText>
          <AppText tone="ink2">
            Le nom « Moni », son logo et ses éléments graphiques appartiennent à l’éditeur. Les
            bibliothèques tierces utilisées restent soumises à leurs propres licences.
          </AppText>
        </Card>
        <Card title="Nature du service">
          <AppText tone="ink2">
            Moni est un outil de suivi de budget personnel. Les repères affichés (règle 50/30/20,
            épargne de précaution, simulateur, intérêts estimés…) sont des informations générales et
            ne constituent ni un conseil financier, ni un conseil en investissement. Les taux des
            livrets réglementés sont indicatifs et peuvent avoir changé depuis la dernière version
            de l’application.
          </AppText>
        </Card>
        <Card title="Responsabilité">
          <AppText tone="ink2">
            L’application est fournie « en l’état », sans garantie, dans les limites prévues par la
            loi et par sa licence. Tu restes seul responsable des données que tu saisis et de leurs
            sauvegardes.
          </AppText>
        </Card>
        <Card title="Droit applicable">
          <AppText tone="ink2">Les présentes mentions sont régies par le droit français.</AppText>
        </Card>
      </Grid>
    </Screen>
  );
}
