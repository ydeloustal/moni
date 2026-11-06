import { AppText, Card, Grid, Screen } from '@/components';

/** Legal notice and terms of use. Keep in sync with docs/LEGAL_NOTICE.md. */
export function LegalNoticeScreen() {
  return (
    <Screen>
      <Grid max={2}>
        <Card title="Éditeur">
          <AppText>
            Moni est éditée par Yoan Deloustal, à titre non professionnel (particulier), sans but
            lucratif.
          </AppText>
          <AppText tone="ink2" selectable>
            Contact : yoandeloustal45@gmail.com
          </AppText>
          <AppText tone="ink2">Directeur de la publication : Yoan Deloustal.</AppText>
        </Card>

        <Card title="Distribution">
          <AppText tone="ink2">
            Les applications Android et iOS sont distribuées par Google Play (Google Ireland
            Limited, Gordon House, Barrow Street, Dublin 4, Irlande) et l’App Store (Apple
            Distribution International Ltd., Hollyhill Industrial Estate, Hollyhill, Cork, Irlande).
          </AppText>
          <AppText tone="ink2">
            L’application fonctionne entièrement sur ton appareil : l’éditeur n’héberge aucune
            donnée de budget.
          </AppText>
        </Card>

        <Card title="Ce qu’est Moni, et ce qu’elle n’est pas">
          <AppText tone="ink2">
            Moni est un outil de suivi et de prévision de budget. Tu y saisis toi-même tes revenus,
            dépenses, soldes, livrets et objectifs ; l’application calcule des totaux, des
            prévisions et des repères.
          </AppText>
          <AppText tone="ink2">
            Moni n’est pas une banque ni un agrégateur de comptes : elle n’est reliée à aucun compte
            et n’exécute aucune opération. Ce n’est ni un conseil financier ou en investissement, ni
            un outil comptable ou fiscal.
          </AppText>
          <AppText tone="ink2">
            Les résultats dépendent entièrement des informations saisies. Les taux des livrets sont
            ceux connus à la date de la version installée : ils sont indicatifs.
          </AppText>
        </Card>

        <Card title="Conditions d’utilisation">
          <AppText tone="ink2">
            Moni est gratuite, sans compte et sans publicité. Tout le monde peut l’utiliser, pour
            tout usage, y compris le budget d’une activité professionnelle. L’utiliser vaut
            acceptation de ces conditions ; sur l’App Store et Google Play, leurs conditions
            s’appliquent en plus.
          </AppText>
          <AppText tone="ink2">
            Tes données restent sur ton appareil et l’éditeur n’y a pas accès : tu es seul
            responsable de ce que tu saisis et de tes sauvegardes. Une désinstallation, un
            changement d’appareil ou un nettoyage du navigateur peut tout effacer : exporte
            régulièrement une sauvegarde .moni.
          </AppText>
          <AppText tone="ink2">
            Un code de verrouillage ou une phrase de passe oubliés ne peuvent pas être récupérés. En
            cas d’oubli du code, la seule solution est d’effacer les données de l’appareil puis de
            restaurer une sauvegarde.
          </AppText>
          <AppText tone="ink2">
            L’éditeur peut faire évoluer, suspendre ou arrêter l’application et ces conditions. La
            version à jour est toujours sur cette page.
          </AppText>
        </Card>

        <Card title="Responsabilité">
          <AppText tone="ink2">
            L’application est fournie « en l’état », sans garantie de fonctionnement ininterrompu,
            d’absence d’erreur ou d’adéquation à un besoin particulier. L’éditeur ne pourra être
            tenu responsable des décisions prises sur la base de ses calculs, ni d’une perte de
            données, dans les limites autorisées par la loi. Cette limitation ne s’applique pas en
            cas de faute lourde ou intentionnelle de l’éditeur.
          </AppText>
        </Card>

        <Card title="Licence et propriété intellectuelle">
          <AppText tone="ink2">
            L’application distribuée par l’éditeur peut être utilisée librement par tous. Son code
            source est publié sous la licence PolyForm Noncommercial 1.0.0 : il peut être lu,
            modifié et partagé à des fins non commerciales. Toute utilisation commerciale du code,
            par exemple vendre ou publier une application dérivée, nécessite l’accord écrit de
            l’éditeur.
          </AppText>
          <AppText tone="ink2">
            Le logo et les éléments graphiques de Moni sont la propriété de l’éditeur. Les
            bibliothèques tierces utilisées restent soumises à leurs propres licences.
          </AppText>
        </Card>

        <Card title="Données personnelles">
          <AppText tone="ink2">
            Moni ne collecte aucune donnée (voir Réglages → Confidentialité). Si tu écris à
            l’adresse de contact, ton adresse e-mail et ton message servent uniquement à te
            répondre.
          </AppText>
        </Card>

        <Card title="Droit applicable">
          <AppText tone="ink2">
            Ces conditions sont régies par le droit français. En cas de difficulté, contacte d’abord
            l’éditeur pour chercher une solution amiable ; à défaut, les tribunaux compétents sont
            ceux désignés par la loi.
          </AppText>
        </Card>
      </Grid>
    </Screen>
  );
}
