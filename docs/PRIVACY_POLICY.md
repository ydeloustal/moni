# Politique de confidentialité de Moni

_Dernière mise à jour : 6 novembre 2026_

## En bref

**Moni ne collecte, ne reçoit et ne transmet aucune donnée.** Tes informations restent sur ton appareil (téléphone,
tablette ou navigateur). Il n'y a ni compte, ni serveur de données, ni publicité, ni mesure d'audience, ni traceur, ni
rapport de plantage automatique.

## Éditeur

Yoan Deloustal, particulier — contact : yoandeloustal45@gmail.com. Voir aussi les [mentions légales](LEGAL_NOTICE.md).

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
permission d'accès à Internet (sa seule permission sensible est la caméra, pour le transfert par QR code). Dans un navigateur, une politique de sécurité du contenu interdit à la page toute
requête réseau ; seule la version web elle-même est chargée depuis son hébergeur, comme n'importe quel site (cet
hébergeur peut voir l'adresse IP de la connexion, comme pour toute page web, mais ne reçoit aucune donnée de budget).

## Transfert entre appareils

Tu peux copier tes données d'un appareil à un autre (téléphone, tablette, ordinateur) sans passer par Internet :
l'appareil qui envoie affiche une suite de QR codes, l'autre les lit avec sa caméra. Les données sont compressées
puis **chiffrées** sur l'appareil (Argon2id + XChaCha20-Poly1305) avec un code à usage unique affiché à l'écran : une
personne qui filmerait les QR codes sans ce code ne peut rien en lire. Rien n'est envoyé à un serveur.

La **caméra** n'est utilisée que pendant le scan d'un transfert, et seulement si tu l'autorises. Aucune image n'est
enregistrée ni envoyée ; le micro n'est jamais demandé. Dans un navigateur, l'image de la webcam est analysée dans la
page même.

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

## Verrouillage de l'application

L'accès à Moni est protégé par un code à 6 chiffres, et, si ton appareil le permet et si tu l'acceptes, par la
biométrie (empreinte, visage). Le code n'est jamais enregistré en clair : seule une empreinte cryptographique (hachage
salé) est conservée dans le stockage sécurisé du système (trousseau iOS, Keystore Android). La biométrie est gérée
entièrement par le système : Moni ne reçoit ni ne conserve aucune donnée biométrique. Dans un navigateur, l'empreinte
du code est conservée dans l'espace du site.

## Durée de conservation et suppression

Les données sont conservées sur ton appareil jusqu'à ce que tu les effaces : Réglages → « Effacer toutes mes
données », ou désinstallation de l'application (ou suppression des données du site dans le navigateur).

## Tes droits

L'éditeur ne détenant aucune donnée te concernant, il ne peut ni y accéder, ni les rectifier, ni les effacer : tu en
gardes la maîtrise complète sur ton appareil. Pour toute question : yoandeloustal45@gmail.com. Tu peux aussi
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
