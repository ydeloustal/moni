# Cahier des charges : Moni (v1.0.0)

> Synthèse rédigée le 04/11/2026 à partir du README, de `docs/`, de `SECURITY.md`, de `app.json` et du code de `src/`.
> L'état décrit est celui du 22/10/2026 (dernier point documenté dans [STATUS.md](STATUS.md)).

---

## 1. Présentation

**Moni** est une application de **gestion de budget personnel** pour le **Web, Android et iOS**, conçue pour protéger la vie privée : toutes les données restent sur l'appareil de l'utilisateur. Il n'y a ni compte, ni serveur de données, ni publicité, ni traceur.

Elle prend la suite d'une **ancienne version PHP** (`legacy/`), utilisée par une seule personne et hébergée sur un VPS. Les calculs de cette version ont été repris en TypeScript et l'interface a été entièrement réécrite.

## 2. Objectifs

| Objectif                          | Ce qu'il implique                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| Savoir où on en est               | Solde réel, reste du mois, montant à dépenser par jour, fin de mois prévue                |
| Anticiper                         | Prévisions sur 12 mois et plan d'épargne qui ne descend jamais sous une marge de sécurité |
| Suivre son épargne                | Livrets français, intérêts estimés selon la règle officielle, objectifs                   |
| Garder la maîtrise de ses données | Fonctionnement local, sauvegarde chiffrée, exports ouverts                                |
| Coûter presque rien               | Pas de serveur applicatif : environ 15 à 200 €/an selon les plateformes                   |

## 3. Périmètre

- **Utilisateurs visés** : particuliers en France (les taux réglementés sont propres à la France), sans connaissance financière particulière.
- **Plateformes** : Web (site statique), Android (cible API 36), iOS. Une seule base de code React Native + Expo SDK 58.
- **Exclu par principe** : connexion aux comptes bancaires (DSP2), conseil sur des produits financiers précis, publicité ciblée, collecte de données.

## 4. Fonctions demandées

### 4.1 Revenus et dépenses

- **Lignes récurrentes** : jour du mois (31 signifie le dernier jour), fréquence mensuelle, tous les 2 mois, trimestrielle, semestrielle ou annuelle, mois de début et de fin.
- Une ligne peut être **« coupée »** : elle reste enregistrée mais n'est plus comptée, pour simuler « et si j'arrêtais ça ? ».
- **Modification à partir d'un mois donné** (par exemple une hausse de loyer) : les mois passés restent exacts.
- **Opérations ponctuelles** datées. Elles sont cochées automatiquement si leur date est déjà passée.
- **Dupliquer**, **annuler** après un ajout, une modification ou une suppression.

### 4.2 Catégories

- Personnalisables : nom, couleur, nature « besoin » ou « envie » (utilisée pour la règle 50/30/20).
- À la suppression d'une catégorie, ses opérations sont réaffectées à une autre.

### 4.3 Abonnements

- Une ligne peut être marquée comme abonnement. Une vue dédiée affiche le coût **lissé par mois** et **par an**.

### 4.4 Solde et mise à jour

- L'utilisateur saisit le solde lu dans l'appli de sa banque, à une date donnée.
- Il coche les opérations « déjà passées ». **Aucune opération n'est comptée deux fois** et un écart éventuel est signalé.
- Ce comportement est vérifié par un test de parité avec la version PHP.

### 4.5 Tableau de bord (accueil)

- Reste du mois, montant à dépenser par jour, fin de mois prévue.
- Prévisions sur 12 mois et **plan d'épargne prudent**, réglé par la marge de sécurité.

### 4.6 Historique et statistiques

- Mois passés et à venir (sur 6 ou 12 mois), moyennes, tendance (dépenses comparées à la moyenne des 3 mois précédents), dépenses par catégorie avec graphiques.

### 4.7 Épargne

- **Livrets réglementés** : Livret A, LDDS, LEP, CEL, PEL (au taux de sa « génération », selon la date d'ouverture). Livret jeune avec contrôle du plancher légal. Livret bancaire ou autre avec un taux saisi par l'utilisateur et un rappel de vérification après 6 mois. Plafonds pris en compte.
- Versements et retraits, **intérêts estimés selon la règle officielle des quinzaines**, y compris quand le taux change en cours d'année.
- **Un taux n'est jamais inventé** : une quinzaine sans taux connu est signalée comme telle.
- **Taux datés et sourcés** (Journal officiel, Service-Public.fr) dans `rates/regulated.json`, avec une alerte si une révision est en retard. Voir [RATES.md](RATES.md).
- Une **mise à jour des taux par le réseau** est possible : facultative, désactivée par défaut, avec un fichier signé en Ed25519.

### 4.8 Objectifs et simulateur

- Objectifs d'épargne : montant visé, progression, délai estimé.
- Simulateur : versement mensuel et durée, au taux du Livret A comparé à un taux choisi par l'utilisateur.

### 4.9 Repères

- Mois dans le rouge, fins de contrat, coût total des abonnements, règle 50/30/20, épargne de précaution.
- Ce sont des informations **générales**, jamais un conseil en investissement.

### 4.10 Sauvegarde, export, import

- **Sauvegarde chiffrée `.moni`** (Argon2id + XChaCha20-Poly1305), avec une phrase de passe d'au moins 10 caractères et un rappel au bout de 30 jours.
- **Exports JSON** (toutes les données) et **CSV** (opérations), avec une protection contre l'injection de formules dans le CSV.
- **Import** : sauvegarde Moni, export JSON, ou **export de l'ancienne version PHP** converti automatiquement (euros convertis en centimes, abonnements, coches conservées).
- **Récupération** : si le fichier de données est abîmé, la version précédente est utilisée. Sinon un écran propose de restaurer une sauvegarde. Rien n'est jamais effacé automatiquement.
- Détails : [BACKUP.md](BACKUP.md).

### 4.11 Réglages et confidentialité

- Thème clair ou sombre, marge de sécurité, page « Confidentialité » (aucun traceur, liste des connexions réseau), **« Effacer toutes mes données »**.

### 4.12 Écrans

- Onglets : **Accueil**, **Opérations**, **Historique**, **Épargne**, **Réglages**.
- Fenêtres : opération, solde, catégorie, livret, objectif, taux, sauvegarde, confidentialité.

## 5. Exigences non fonctionnelles

| Domaine                   | Exigence                                                                                                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Confidentialité**       | Aucune collecte et aucun SDK d'analyse, de publicité ou de plantage. Pas de permission `INTERNET` en production ; seules la biométrie (verrouillage) et la caméra (transfert par QR code) sont autorisées. Les autres permissions sont bloquées. Voir [PRIVACY.md](PRIVACY.md).          |
| **Sécurité**              | Validation stricte de tout ce qui vient de l'extérieur (`sanitizeState`, `parseRatesFile`), imports limités à 20 Mo, CSP stricte sur le web, signature du fichier de taux. Voir [SECURITY.md](../SECURITY.md). |
| **Fiabilité des calculs** | Montants en **centimes entiers**. Cœur de calcul **pur** (`src/core`). Parité avec la version PHP au centime près sur 300 budgets aléatoires.                                                                  |
| **Intégrité des données** | Écriture atomique avec conservation de la version précédente. Format versionné (`SCHEMA_VERSION`) avec migrations testées. Une version plus ancienne de l'appli refuse d'ouvrir des données plus récentes.     |
| **Performances**          | 300 lignes récurrentes, 18 000 opérations sur 10 ans : environ 76 ms de calcul sous Node. Au-delà d'environ 50 000 opérations, passer à SQLite.                                                                |
| **Accessibilité**         | Rôles et libellés pour les lecteurs d'écran, zones tactiles d'au moins 44 px.                                                                                                                                  |
| **Qualité**               | `npm run check` lance le typage, ESLint, 84 tests Jest et le contrôle de fraîcheur des taux. La CI échoue chaque lundi si les taux sont périmés.                                                               |

## 6. Architecture technique

```
src/app (écrans Expo Router) → src/state (état, persistance, taux) → src/core (calculs purs)
                     src/ui, src/screens          src/storage (fichier natif / IndexedDB), src/platform
```

- **Données stockées** : lignes récurrentes, opérations, catégories, livrets, objectifs, coches de statut (opérations comprises dans le solde ou passées depuis), réglages.
- **Persistance** : sur mobile, `Documents/moni/state.json` (avec `state.prev.json`). Sur le web, IndexedDB. Enregistrement 300 ms après une modification, et forcé quand l'appli passe en arrière-plan.
- **Modification de l'état** : uniquement par `commit(fn)` avec une fonction pure. C'est ce qui permet l'annulation, les tests et une future synchronisation.
- **Déploiement web** : site statique servi par nginx, un dossier par version et un lien symbolique, ce qui permet de revenir instantanément à la version précédente. Voir [DEPLOYMENT.md](DEPLOYMENT.md).
- Détails : [ARCHITECTURE.md](ARCHITECTURE.md).

## 7. Contraintes légales et publication

- À rédiger ou valider : mentions légales (LCEN), politique de confidentialité (projet dans [PRIVACY.md](PRIVACY.md)), déclarations Google Play « Data safety » et Apple « Data Not Collected ».
- **Licence non choisie.** L'audit recommande l'AGPL-3.0, avec la MPL-2.0 comme alternative.
- **Identifiant `fr.moni.app` provisoire.** Il ne pourra plus changer après la publication.
- Recherche d'antériorité sur la marque « Moni ».
- Google Play, compte personnel : test fermé avec 12 testeurs pendant 14 jours avant la production.
- Détails : [LEGAL.md](LEGAL.md), [STORES.md](STORES.md).

## 8. Coûts estimés

Environ **15 à 80 €/an** pour le web et Android, environ **110 à 200 €/an** avec iOS. Le vrai coût est la maintenance, estimée à 4 à 8 h par mois (taux deux fois par an, mises à jour d'Expo, dépendances). **Aucun modèle économique n'est retenu** : dons, subventions ou appli payante restent à décider. Voir [COSTS.md](COSTS.md).

## 9. Avancement

| Plateforme   | État                                                                                    |
| ------------ | --------------------------------------------------------------------------------------- |
| Web          | Fonctionnelle, compilée et testée dans un navigateur. **Non déployée.**                 |
| Android      | APK de release compilé, mais signé avec la clé de debug. **Non testé sur un appareil.** |
| iOS          | Le code JavaScript compile. **La compilation native demande un Mac ou EAS.**            |
| PHP (legacy) | Correctifs de sécurité prêts. **Non déployés.**                                         |

**Restent à faire, par ordre de priorité :**

1. Tests sur de vrais téléphones Android et iOS (stockage, partage de fichiers, durée du chiffrement Argon2id, TalkBack et VoiceOver).
2. Vérifier l'export et l'import de fichiers depuis l'interface. La logique est testée, mais pas les boîtes de dialogue.
3. Sélecteur de date natif (pour l'instant, saisie au format JJ/MM/AAAA).
4. Verrouillage facultatif de l'appli par code ou biométrie.
5. Import de relevés bancaires CSV ou OFX, sans connexion à la banque.
6. Rappels par notifications locales (sauvegarde, révision des taux).
7. Plus tard, et seulement si la demande existe : catalogue communautaire des livrets bancaires, synchronisation chiffrée de bout en bout auto-hébergeable, traductions.

## 10. Décisions en attente (porteur de projet)

- Licence du code.
- Identifiant d'application définitif et nom de domaine.
- Modèle de financement.
- Déploiement sur le VPS (version web et correctifs PHP).
- Publication sur les stores.
- Relecture juridique (mentions légales, confidentialité, repères, chiffrement, marque).
