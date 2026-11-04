# Politique de confidentialité de Moni

_Dernière mise à jour : 4 novembre 2026_

> Texte à faire relire par un juriste avant publication, et à compléter : identité de l'éditeur et adresse de contact
> (champs entre crochets).

## En bref

**Moni ne collecte, ne reçoit et ne transmet aucune donnée.** Tes informations restent sur ton appareil (téléphone,
tablette ou navigateur). Il n'y a ni compte, ni serveur de données, ni publicité, ni mesure d'audience, ni traceur, ni
rapport de plantage automatique.

## Éditeur

[Nom ou raison sociale de l'éditeur], [adresse], [adresse e-mail de contact].

## Données traitées et lieu de stockage

| Donnée                                                                            | Utilité                               | Où                                  | Qui y accède                                                                           |
| --------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------- |
| Revenus, dépenses, abonnements, catégories, remarques                             | Calcul du budget et des prévisions    | Uniquement sur ton appareil         | Toi seul                                                                               |
| Solde du compte, livrets (type, banque, solde, taux saisi, mouvements), objectifs | Prévisions et estimation des intérêts | Uniquement sur ton appareil         | Toi seul                                                                               |
| Préférences (thème, durée de l'historique)                                        | Affichage                             | Uniquement sur ton appareil         | Toi seul                                                                               |
| Sauvegardes `.moni` (chiffrées) et exports JSON / CSV (non chiffrés)              | Restauration, tableur                 | Là où tu choisis de les enregistrer | Toute personne ayant le fichier (et, pour une sauvegarde chiffrée, la phrase de passe) |

L'éditeur n'a accès à **aucune** de ces données : elles ne lui sont jamais envoyées.

## Aucune connexion réseau

L'application ne contacte aucun serveur : pas de compte, pas de synchronisation, pas de mise à jour à distance, pas
de téléchargement de taux, pas de polices ni d'images externes. Sur Android, l'application ne demande même pas la
permission d'accès à Internet. Dans un navigateur, une politique de sécurité du contenu interdit à la page toute
requête réseau ; seule la version web elle-même est chargée depuis son hébergeur, comme n'importe quel site (cet
hébergeur peut voir l'adresse IP de la connexion, comme pour toute page web, mais ne reçoit aucune donnée de budget).

## Sauvegardes du système

- **Android / iOS** : les données de Moni peuvent être incluses dans la sauvegarde automatique de ton téléphone
  (Google / iCloud) selon tes réglages. Elles sont alors conservées par Google ou Apple dans ton compte, selon leurs
  propres conditions. Tu peux désactiver la sauvegarde de Moni dans les réglages du système.
- **Navigateur** : les données sont stockées dans l'espace du site sur ton appareil. Le navigateur peut les effacer
  (nettoyage, navigation privée, manque d'espace) : pense à faire des sauvegardes.

## Sécurité

- Les données sont enregistrées dans l'espace privé de l'application, chiffré par le système lorsque l'appareil est
  protégé par un code.
- Les sauvegardes `.moni` sont chiffrées avec ta phrase de passe (Argon2id et XChaCha20-Poly1305). Une phrase de
  passe oubliée rend la sauvegarde irrécupérable : personne d'autre ne la connaît.
- Les exports JSON et CSV ne sont pas chiffrés : conserve-les en lieu sûr.

## Durée de conservation et suppression

Les données sont conservées sur ton appareil jusqu'à ce que tu les effaces : Réglages → « Effacer toutes mes
données », ou désinstallation de l'application (ou suppression des données du site dans le navigateur).

## Tes droits

L'éditeur ne détenant aucune donnée te concernant, il ne peut ni y accéder, ni les rectifier, ni les effacer : tu en
gardes la maîtrise complète sur ton appareil. Pour toute question : [adresse e-mail de contact]. Tu peux aussi
adresser une réclamation à la CNIL (www.cnil.fr).

## Enfants

L'application ne collecte aucune donnée, y compris d'enfants.

## Informations financières

Les repères affichés (règle 50/30/20, épargne de précaution, simulateur…) sont des informations générales, jamais un
conseil en investissement. Les intérêts sont des estimations.

## Modifications

Toute évolution qui ajouterait une collecte ou une transmission de données ferait l'objet d'une mise à jour de cette
politique, d'une information dans l'application et des déclarations des stores, **avant** sa mise en service.

---

**Déclarations des stores** — Google Play « Sécurité des données » : aucune donnée collectée, aucune donnée partagée.
App Store « Confidentialité de l'app » : Données non collectées.
