# Plan : numérisation et extraction automatique (OCR)

> Rédigé le 21/11/2026 pour Moni 1.1.1 (Expo SDK 58, RN 0.88). Statut : **proposition**, rien n'est implémenté.

## 1. Objectif

Permettre de **photographier ou importer** un ticket de caisse, une capture d'écran (appli bancaire, confirmation
de commande), une facture ou un devis, et d'en **extraire automatiquement** les données utiles pour créer, en un
geste validé par l'utilisateur :

| Document         | Ce qu'on en tire                                     | Ce que Moni crée                                      |
| ---------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| Ticket de caisse | Enseigne, date, total TTC, (moyen de paiement)       | Une opération ponctuelle (`Tx`) catégorisée           |
| Capture d'écran  | Une ou plusieurs lignes « libellé / date / montant » | Plusieurs `Tx` en lot (import multiple)               |
| Facture          | Fournisseur, total, date, échéance, périodicité      | Une `Tx` ou une ligne récurrente (`Rule`, abonnement) |
| Devis            | Objet, total TTC, date de validité                   | Un **objectif d'épargne** (`Goal`) + effort mensuel   |

## 2. Contraintes qui structurent le plan

1. **100 % hors ligne** : aucun service OCR en ligne (Google Vision, Textract, API LLM…). Les builds Android de
   production **bloquent la permission `INTERNET`** (`app.config.ts`) : le moteur doit être **embarqué dans l'app**.
2. **Rien ne quitte l'appareil** : l'image est traitée en mémoire puis supprimée par défaut.
3. **Montants en centimes entiers** ; logique métier pure dans `src/features/scan/domain` (ni React, ni horloge,
   ni stockage), testée unitairement.
4. **Persistance via `BudgetRepository`** uniquement ; tout changement de format passe par une migration
   (`SCHEMA_VERSION`, SQLite `user_version`, Dexie `version(n+1)`, import de sauvegarde).
5. **Toujours une étape de validation** : l'OCR propose, l'utilisateur confirme. Aucune écriture silencieuse.
6. Trois plateformes : Android, iOS, Web (PWA).

## 3. Choix techniques

### 3.1 Moteur OCR par plateforme

| Plateforme | Moteur                                                                 | Pourquoi                                                                                                                |
| ---------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Android    | **Google ML Kit Text Recognition v2, variante _bundled_** (latin)      | Modèle inclus dans l'APK (~4 Mo), aucun téléchargement. La variante via Play Services télécharge le modèle → interdite. |
| iOS        | **Apple Vision** (`VNRecognizeTextRequest`, `.accurate`, `fr-FR`)      | Intégré à l'OS, 0 octet ajouté, très bon sur les tickets.                                                               |
| Web        | **Tesseract.js** + `fra.traineddata` (modèle _fast_) **auto-hébergés** | Wasm + modèle servis par le même site et pré-cachés par le service worker.                                              |

Encapsulation : un **module Expo local** `modules/moni-ocr` (Expo Modules API, Kotlin + Swift) exposant :

```ts
recognize(uri: string): Promise<OcrResult>;          // image
recognizePdf(uri: string): Promise<OcrResult[]>;     // une entrée par page
interface OcrResult { lines: { text: string; box: [x, y, w, h]; confidence: number }[]; width: number; height: number }
```

Implémentation web dans `modules/moni-ocr/src/index.web.ts` (même interface). Les **coordonnées** des lignes sont
conservées : elles servent à reconstituer les colonnes (libellé à gauche, montant à droite).

À vérifier avant de coder (règle du projet, docs Expo v58) : API Expo Modules, `expo-image-picker`,
`expo-image-manipulator`, compatibilité New Architecture du SDK ML Kit.

### 3.2 PDF (factures et devis)

- **Natif** : PDF texte → extraction directe (iOS `PDFKit`, Android `PdfRenderer` + rendu image puis OCR, faute
  d'API texte native). PDF scanné → rendu de chaque page en image puis OCR. Limite : 5 pages.
- **Web** : `pdfjs-dist` auto-hébergé (couche texte), repli OCR sur rendu canvas.

### 3.3 Acquisition

- **Appareil photo** : `expo-camera` (déjà présent pour le transfert QR), écran plein cadre avec guide de cadrage.
- **Galerie / captures d'écran** : `expo-image-picker` (à ajouter, `npx expo install`).
- **Fichiers PDF** : `expo-document-picker` (déjà présent).
- **Partage vers Moni** (« Partager → Moni » depuis la galerie ou un mail) : phase 3, via intent Android /
  extension de partage iOS (config plugin).
- **Prétraitement** : `expo-image-manipulator` (redimensionnement à ~2000 px de côté, rotation EXIF). Le
  redressement de perspective est laissé aux moteurs (Vision et ML Kit le tolèrent bien).

### 3.4 Conséquences sur le build et la conformité

- Module natif → **plus de compatibilité Expo Go** : développement avec un _development build_
  (`eas build --profile development`), déjà le mode de livraison actuel.
- Taille : ~+4 Mo Android, ~0 iOS, ~+3 Mo web (wasm + modèle fast, chargés **à la première utilisation** seulement).
- **Audit réseau** (`docs/NETWORK_AUDIT.md`) à mettre à jour : Tesseract.js/pdf.js chargent leurs fichiers par
  `fetch` interne ; il faut forcer `workerPath`, `corePath`, `langPath` vers l'origine du site et ajouter un test
  qui échoue si une URL externe apparaît dans le bundle. La règle ESLint `no-restricted-globals` reste intacte
  (le `fetch` est dans la dépendance, pas dans notre code).
- **Politique de confidentialité** : ajouter un paragraphe « Numérisation » (traitement local, image non conservée).
- Permissions : caméra (déjà déclarée), photothèque iOS (`NSPhotoLibraryUsageDescription`) via le config plugin
  d'`expo-image-picker`.

## 4. Architecture applicative

```
app/
  scan.tsx                   # écran capture (caméra / galerie / PDF)
  scan-review.tsx            # écran de validation des données extraites
modules/moni-ocr/            # module Expo local (Kotlin, Swift, web)
src/features/scan/
  domain/                    # PUR, 100 % testé
    normalize.ts             # nettoyage OCR : O→0, l→1, espaces, « 12,5O € »
    amounts.ts               # détection des montants (centimes), formats FR/EN
    dates.ts                 # JJ/MM/AA, « 21 nov. 2026 », etc. → Day
    classify.ts              # ticket | capture | facture | devis | inconnu
    extract/receipt.ts       # total TTC (mots-clés TOTAL, À PAYER, CB…), enseigne (1res lignes)
    extract/invoice.ts       # n° facture, échéance, période, TVA, TTC
    extract/quote.ts         # « Devis », validité, total TTC, acompte
    extract/screenshot.ts    # lignes multiples via colonnes (boîtes englobantes)
    categorize.ts            # suggestion de catégorie (voir § 6)
    recurrence.ts            # détection de récurrence (voir § 6)
    goalPlan.ts              # effort mensuel pour un objectif daté
    types.ts                 # ScanDraft, ExtractedField<T> { value, confidence, source }
  services/ocrService.ts     # appelle moni-ocr, gère le cycle de vie du fichier temporaire
  hooks/useScan.ts
  components/                # FieldWithConfidence, ReceiptPreview (surlignage des zones lues)
  screens/
```

Flux : **acquisition → prétraitement → OCR (natif) → `classify` → `extract/*` → `ScanDraft` → écran de
validation → action du store** (`addTx`, `addRule`, `addGoal`, existantes ou étendues) → suppression du fichier
temporaire.

Chaque champ extrait porte une **confiance** (haute/moyenne/basse) : les champs incertains sont mis en évidence et
le bouton de validation reste actif (l'utilisateur corrige au besoin).

## 5. Parcours fonctionnels

### 5.1 Point d'entrée

- Bouton **« Scanner »** sur l'accueil et dans Opérations (icône appareil photo), plus action dans le formulaire
  d'ajout d'opération (« Remplir depuis un ticket »).

### 5.2 Ticket de caisse → opération

1. Photo → 2. Moni affiche : enseigne, date, montant, catégorie suggérée, aperçu avec la zone « TOTAL » surlignée
   → 3. « Enregistrer » crée la `Tx` (dépense) ; annulable par le `UndoSnackbar` existant.

### 5.3 Capture d'écran bancaire → lot d'opérations

1. Import d'une ou plusieurs captures → 2. liste des lignes détectées, cases à cocher, **doublons pré-décochés**
   (même montant, date ±2 j, libellé proche d'une `Tx` existante) → 3. « Ajouter N opérations ».

### 5.4 Facture → opération ou ligne récurrente

- Si période/échéance détectée ou fournisseur connu comme récurrent (énergie, box, assurance…) : proposition
  « Créer une ligne mensuelle/trimestrielle/annuelle » (`Rule`, `subscription: true` si pertinent), avec jour du
  mois = jour d'échéance.
- Sinon : `Tx` à la date d'échéance (dépense **à venir**, donc prise en compte dans la fin de mois prévue).

### 5.5 Devis → objectif d'économie

1. Scan du devis (ex. : réparation voiture 1 240 € TTC, valable jusqu'au 15/01/2027).
2. Écran « Créer un objectif » pré-rempli : nom (objet du devis), **cible = total TTC**, échéance (date de
   validité ou date choisie), déjà épargné = 0.
3. Moni calcule l'**effort mensuel** (`goalPlan`) et le compare à la capacité d'épargne du plan prudent existant
   (marge de sécurité respectée) : « 310 €/mois pendant 4 mois — compatible avec votre plan » ou « dépasse votre
   capacité de 85 €/mois : décaler l'échéance au 15/03 ? ».
4. Option « Créer aussi le versement mensuel » : `Rule` de dépense « Épargne : <objectif> » sur la durée.

## 6. Automatisations

| Automatisation                 | Déclencheur                                                              | Comportement                                                                                                                           | Phase |
| ------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Catégorisation apprise         | Validation d'un scan                                                     | Mémorise `enseigne normalisée → catégorie` ; réutilisée au scan suivant. Repli : dictionnaire de mots-clés FR (Carrefour, SNCF, EDF…). | 1     |
| Détection de doublons          | Avant enregistrement                                                     | Signale une `Tx` existante proche (montant identique, date ±2 j, libellé similaire).                                                   | 1     |
| Suggestion de ligne récurrente | 2e scan du même fournisseur à ~1/2/3/6/12 mois d'écart                   | Propose de transformer en `Rule` (et abonnement).                                                                                      | 2     |
| Objectif depuis un devis       | Document classé « devis »                                                | Parcours 5.5, effort mensuel + contrôle de capacité.                                                                                   | 2     |
| Échéance de facture            | Facture avec date d'échéance                                             | `Tx` future, visible dans les prévisions ; option rappel local (phase 3).                                                              | 2     |
| Mise à jour d'objectif         | Scan d'une facture qui solde un devis (même fournisseur, montant proche) | Propose de marquer l'objectif atteint et d'enregistrer la dépense.                                                                     | 3     |
| Écart devis / facture          | Idem                                                                     | Affiche l'écart (« +7 % par rapport au devis »).                                                                                       | 3     |
| Rappels locaux                 | Échéances, fin de validité d'un devis                                    | `expo-notifications` en mode **local uniquement** (aucun push serveur).                                                                | 3     |

Les règles apprises sont des **données utilisateur** : elles sont exportées dans la sauvegarde chiffrée, effaçables
depuis Réglages (« Oublier les enseignes apprises »), et jamais partagées.

## 7. Modèle de données (migration `SCHEMA_VERSION` 1 → 2)

```ts
interface Goal {
  // existant, étendu
  id;
  name;
  target;
  saved;
  deadline: Day | null; // NOUVEAU (null pour les objectifs existants)
  source: 'manual' | 'quote'; // NOUVEAU
}
interface MerchantHint {
  // NOUVELLE collection
  id: string;
  key: string; // enseigne normalisée (majuscules, sans accents ni n° de magasin)
  categoryId: string | null;
  lastAmount: Cents;
  lastDate: Day;
  count: number;
}
interface Tx {
  /* … */ origin?: 'scan';
} // optionnel : statistiques et doublons
```

À faire dans le même lot : `diffStates` (+ `merchantHints`), migration SQLite v2 (`ALTER TABLE goals`, nouvelle
table), Dexie `version(2)` avec `upgrade()`, migration de l'import de sauvegarde v1 → v2, tests de migration
existants étendus. **Les images ne sont pas stockées** en phase 1-2 (vie privée, taille des sauvegardes) ; une
pièce jointe facultative pourra être étudiée plus tard.

## 8. Qualité et tests

- **Corpus de référence** : ~60 sorties OCR texte anonymisées (tickets de grandes enseignes, factures énergie/box,
  devis artisans, captures d'applis bancaires FR) en `src/features/scan/domain/__fixtures__`, avec le résultat
  attendu. Les tests portent sur le texte, pas sur les images : rapides et déterministes en CI.
- **Objectifs de mesure** sur le corpus : total correct ≥ 95 % (tickets), date ≥ 90 %, classification ≥ 90 %.
- Tests composants de l'écran de validation (`@testing-library/react-native`), tests de migration v1 → v2.
- Test du module natif : manuel sur appareil (Android bas de gamme + iPhone), temps OCR cible < 1,5 s.
- `npm run check` (typecheck, lint, tests, taux) vert avant chaque fusion.

## 9. Découpage et estimation

| Phase | Contenu                                                                                                          | Estimation |
| ----- | ---------------------------------------------------------------------------------------------------------------- | ---------- |
| 0     | Spike : module `moni-ocr` Android + iOS, mesure qualité/temps sur 20 tickets réels                               | 3 j        |
| 1     | Tickets → `Tx` : capture, domaine `receipt`, écran de validation, catégorisation apprise, doublons, migration v2 | 8 j        |
| 2     | Factures, devis → objectifs (effort mensuel), captures multi-lignes, PDF, récurrences                            | 8 j        |
| 3     | Web (Tesseract.js + pdf.js auto-hébergés, audit réseau), partage vers Moni, rappels locaux, écarts devis/facture | 7 j        |

Livrable de chaque phase : une version mineure (1.2.0, 1.3.0, 1.4.0) via EAS, documentation
(`CAHIER_DES_CHARGES.md`, `PRIVACY_POLICY.md`, `NETWORK_AUDIT.md`) à jour.

## 10. Risques

| Risque                                              | Parade                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Tickets froissés, thermiques pâlis                  | Guide de cadrage, conseil lumière, saisie manuelle toujours possible                                                 |
| Faux total (sous-total, rendu monnaie, TVA)         | Priorité aux mots-clés « TOTAL TTC / À PAYER / CB », cohérence avec la somme des lignes, champ marqué « à vérifier » |
| Taille et lenteur du web (wasm)                     | Chargement différé, modèle _fast_, fonction marquée « bêta » sur le web                                              |
| Dépendance ML Kit (API, New Architecture)           | Spike phase 0 ; repli possible sur Tesseract natif                                                                   |
| Fuite réseau involontaire (CDN par défaut des libs) | Chemins forcés en local + test de non-régression sur le bundle                                                       |

## 11. Décisions à prendre

1. Web dès la phase 1 ou seulement en phase 3 (recommandé : phase 3).
2. Conserver ou non une miniature du justificatif (recommandé : non pour l'instant).
3. Créer automatiquement la ligne « versement mensuel » d'un objectif, ou seulement la proposer (recommandé : proposer).
