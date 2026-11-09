# CI/CD et déploiement

Pipeline GitHub Actions de Moni, alignée sur le Git Flow : `main` (production), `develop` (intégration),
`feature/*`, `release/*`, `hotfix/*`. Une version est un tag `vX.Y.Z` posé sur `main`.

## Vue d'ensemble

| Workflow                         | Déclencheur                                | Ce qu'il fait                                                                                                                 |
| -------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`       | push et PR vers `develop` / `main`, cron   | `checks` (typecheck, lint, format, tests, taux, expo-doctor) et `build-web` (export web de vérification). Rien n'est déployé. |
| `.github/workflows/release.yml`  | push d'un tag `vX.Y.Z` (sur `main`)        | `checks` → `build-web` → `deploy-web` (VPS) et `checks` → `build-mobile` (EAS, Android `.aab` + `.apk`).                      |
| `.github/workflows/rollback.yml` | manuel (Actions > Rollback > Run workflow) | Remet en ligne une release web encore présente sur le VPS, puis health check.                                                 |

```
tag vX.Y.Z ─► checks ─┬─► build-web ─► deploy-web   rsync → releases/X.Y.Z → bascule current → health check
                      │                             (échec : retour automatique à la release précédente)
                      └─► build-mobile              eas build android production + production-apk (--no-wait)
```

- **Version** : le tag fait foi. `scripts/deploy/set-version.sh` l'écrit dans `package.json` avant chaque
  build ; `app.config.ts` lit `version` depuis `package.json`. Le web (`Constants.expoConfig.version`)
  et Android (`versionName`) portent donc la version du tag. Le `versionCode` est incrémenté par EAS
  (`appVersionSource: remote`).
- **Web** : `npm run build:web` = `expo export --platform web` + `scripts/build-pwa.mjs` (service worker
  hors-ligne et CSP `connect-src 'none'`). Un fichier `version.txt` est ajouté pour le health check.
- **Mobile** : deux builds EAS cloud par version, jamais envoyés sur le VPS. Le job s'arrête dès que les
  builds sont en file d'attente (`--no-wait`) : suivi et téléchargements sur expo.dev > projet moni > Builds.

Fichiers :

- `.github/actions/setup-ssh/action.yml` : clé de déploiement, clé d'hôte épinglée, alias SSH `vps` ;
- `scripts/deploy/remote.sh` : gestion des releases **sur le VPS** (transmis par SSH, jamais copié) ;
- `scripts/deploy/healthcheck.sh` : health check HTTP ;
- `scripts/deploy/set-version.sh` : injection de la version ;
- `deploy/apache/` : vhosts Apache (`moni.conf` pour HTTP → HTTPS, `moni-le-ssl.conf` pour HTTPS) et
  `install.sh` qui les installe.

Serveur actuel :

| Élément            | Valeur                                                         |
| ------------------ | -------------------------------------------------------------- |
| VPS                | `mmi24c04.mmi-troyes.fr` (SSH, port 22)                        |
| Utilisateur CI     | `deploy` (clé dédiée, option `restrict`)                       |
| Site               | https://moni.mmi24c04.mmi-troyes.fr                            |
| Empreinte SSH hôte | `SHA256:p+az/VlxPOsxFnUtjtNFjR9WuXS/jgzpjbz0bzHUqZw` (ED25519) |

Arborescence sur le VPS :

```
/var/www/moni/
├── current -> releases/1.2.0     lien servi par Apache, basculé atomiquement (rename)
└── releases/
    ├── 1.0.0/  1.1.0/  1.1.1/  1.2.0/   les 5 plus récentes sont conservées
```

## Secrets et variables GitHub

Dans **Settings > Environments**, crée l'environnement **`production`** :

- _Deployment branches and tags_ : **Selected branches and tags**, puis ajoute la règle de tag `v*.*.*` et
  la branche `main` (nécessaire au workflow Rollback, lancé depuis `main`) ;
- optionnel : _Required reviewers_ = toi, pour valider chaque mise en production.

| Nom               | Type     | Où                         | Valeur                                                                    |
| ----------------- | -------- | -------------------------- | ------------------------------------------------------------------------- |
| `VPS_SSH_KEY`     | secret   | environnement `production` | Clé **privée** de déploiement (fichier entier, lignes BEGIN/END incluses) |
| `VPS_KNOWN_HOSTS` | secret   | environnement `production` | Clé d'hôte du VPS (sortie de `ssh-keyscan`)                               |
| `VPS_HOST`        | secret   | environnement `production` | IP ou nom DNS du VPS                                                      |
| `VPS_USER`        | secret   | environnement `production` | `deploy`                                                                  |
| `VPS_PORT`        | secret   | environnement `production` | Optionnel, port SSH si différent de 22                                    |
| `EXPO_TOKEN`      | secret   | dépôt (Secrets > Actions)  | Jeton d'accès Expo                                                        |
| `PROD_URL`        | variable | environnement `production` | URL publique, sans `/` final : `https://moni.mmi24c04.mmi-troyes.fr`      |

Générer les valeurs (sur ton poste) :

```bash
# Clé SSH dédiée à la CI, sans passphrase (elle ne sert qu'à ça)
ssh-keygen -t ed25519 -N "" -C "github-actions@moni" -f ~/.ssh/moni_deploy
cat ~/.ssh/moni_deploy        # → VPS_SSH_KEY   (privée)
cat ~/.ssh/moni_deploy.pub    # → à installer sur le VPS (voir plus bas)

# Clé d'hôte du VPS → VPS_KNOWN_HOSTS
ssh-keyscan -t ed25519 -p 22 <host>
# Vérifie l'empreinte : les deux commandes doivent afficher la même chose
ssh-keyscan -t ed25519 -p 22 <host> | ssh-keygen -lf -
ssh <toi>@<host> 'ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub'
```

`EXPO_TOKEN` : expo.dev > Account settings > **Access tokens** > Create token (ou un _robot user_ si le
projet appartient à une organisation).

Avec la CLI GitHub (`gh`), si tu préfères :

```bash
gh secret set VPS_SSH_KEY --env production < ~/.ssh/moni_deploy
gh secret set VPS_KNOWN_HOSTS --env production --body "$(ssh-keyscan -t ed25519 <host>)"
gh secret set VPS_HOST --env production --body "<host>"
gh secret set VPS_USER --env production --body "deploy"
gh secret set EXPO_TOKEN
gh variable set PROD_URL --env production --body "https://moni.mmi24c04.mmi-troyes.fr"
```

Après le premier déploiement réussi, supprime `~/.ssh/moni_deploy` de ton poste si tu n'en as plus
besoin : la clé ne vit plus que dans les secrets GitHub.

## Mise en place du VPS Debian 12 (une seule fois)

```bash
# Paquets
sudo apt update && sudo apt install -y apache2 rsync certbot python3-certbot-apache

# Utilisateur de déploiement : pas de mot de passe, pas de sudo
sudo adduser --disabled-password --gecos "Moni deploy" deploy

# Dossiers : seul `deploy` peut écrire dans /var/www/moni ; Apache (www-data) lit seulement
sudo mkdir -p /var/www/moni/releases
sudo chown -R deploy:deploy /var/www/moni
sudo chmod 755 /var/www/moni /var/www/moni/releases

# Clé publique de la CI. L'option `restrict` interdit pty, redirections de ports, agent et X11.
sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "restrict $(cat moni_deploy.pub)" | sudo tee /home/deploy/.ssh/authorized_keys
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys

# Page provisoire, pour qu'Apache et certbot aient un dossier à servir avant le 1er déploiement
sudo -u deploy mkdir -p /var/www/moni/releases/0.0.0
echo '<!doctype html><title>Moni</title>Bientôt.' | sudo -u deploy tee /var/www/moni/releases/0.0.0/index.html
sudo -u deploy ln -sfn releases/0.0.0 /var/www/moni/current
```

(`moni_deploy.pub` : copie le fichier sur le VPS, ou colle directement son contenu après `restrict `.)

Vérifie depuis ton poste : `ssh -i ~/.ssh/moni_deploy deploy@<host> 'ls -l /var/www/moni'`.

`deploy` n'a ni sudo ni mot de passe, et ne possède que `/var/www/moni` (et son dossier personnel).

### Apache

Le sous-domaine et son certificat Let's Encrypt existent déjà (`certbot --apache -d <domaine>` pour un
nouveau domaine). Pour installer ou mettre à jour les vhosts depuis le dépôt :

```bash
scp -r deploy/apache mmi24c04@mmi24c04.mmi-troyes.fr:/tmp/moni-apache
ssh -t mmi24c04@mmi24c04.mmi-troyes.fr 'sudo bash /tmp/moni-apache/install.sh'
```

`install.sh` sauvegarde les fichiers en place (`*.bak-<date>`), installe les nouveaux, active
`headers`/`rewrite`/`ssl` et ne recharge Apache que si `apache2ctl configtest` passe (sinon il
restaure la sauvegarde). Il exige que `/var/www/moni/current` existe déjà.

Points clés du vhost : `DocumentRoot /var/www/moni/current` avec `FollowSymLinks`, `FallbackResource
/index.html` pour le routing côté client (Expo Router), `no-cache` sur `index.html`, `sw.js`,
`manifest.webmanifest` et `version.txt`, cache long sur `/_expo/static/` (fichiers hashés). La bascule du
lien `current` ne demande aucun rechargement d'Apache.

## Projet EAS (une seule fois)

```bash
npx eas-cli@latest login
npx eas-cli@latest init              # crée le projet sur expo.dev et affiche son projectId
```

`app.config.ts` étant dynamique, `eas init` ne peut pas l'écrire lui-même : reporte l'identifiant dans
la constante `EAS_PROJECT_ID` de `app.config.ts` (ce n'est pas un secret) et commite-le via une
branche `feature/*`.

Le keystore Android ne peut pas être créé en mode non interactif. Génère-le une fois sur ton poste
(EAS le stocke ensuite et la CI le réutilise) :

```bash
npx eas-cli@latest credentials -p android   # profil production > Keystore > Set up a new keystore
```

Si l'app est déjà publiée avec un `versionCode`, aligne d'abord le compteur distant :
`npx eas-cli@latest build:version:set -p android`.

## Protection des branches

Dans **Settings > Rules > Rulesets > New branch ruleset** :

- nom : `develop et main`, _Enforcement_ : Active, cibles : `main` et `develop` ;
- cocher **Restrict deletions**, **Block force pushes**, **Require a pull request before merging** ;
- cocher **Require status checks to pass** et ajouter `checks` et `build-web` (ils apparaissent dans la
  liste après une première exécution de la CI).

Puis un **tag ruleset** (_New tag ruleset_) ciblant `v*` avec **Restrict creations**, **Restrict updates**
et **Restrict deletions**, en ajoutant le rôle _Repository admin_ en _bypass_ : seul toi peux publier
une version.

(Les rulesets sont gratuits sur un dépôt public ; sur un dépôt privé ils demandent GitHub Pro.)

## Publier une version (Git Flow)

Exemple pour `1.2.0`, à partir de `develop` à jour :

```bash
git switch develop && git pull
git switch -c release/1.2.0
npm version 1.2.0 --no-git-tag-version      # met à jour package.json et package-lock.json
git commit -am "chore(release): 1.2.0"
git push -u origin release/1.2.0
```

1. Ouvre une PR `release/1.2.0` → `main`. Seuls des correctifs vont sur la branche de release.
2. Quand la CI est verte, merge avec un **merge commit** (pas de squash, pour garder l'historique commun
   avec `develop`).
3. Tague `main` et pousse le tag :

   ```bash
   git switch main && git pull
   git tag -a v1.2.0 -m "Moni 1.2.0"
   git push origin v1.2.0
   ```

4. Suis **Actions > Release** : déploiement web + health check, puis les builds Android sur expo.dev.
5. Ramène la release dans `develop` : PR `main` → `develop` (merge commit), puis supprime `release/1.2.0`.

**Hotfix** : même procédure en partant de `main` (`git switch -c hotfix/1.2.1 main`), PR vers `main`,
tag `v1.2.1`, puis PR `main` → `develop`.

Le tag doit pointer sur un commit de `main` et respecter `vX.Y.Z`, sinon la release échoue dès le
job `checks`. Si `package.json` diffère du tag, c'est le tag qui l'emporte (avertissement dans le log).
Ne réutilise jamais un tag : publie une nouvelle version.

## Rollback

**Automatique** : si le health check échoue après une mise en ligne (`/` ne répond pas 200, `version.txt`
ne correspond pas, ou le fallback SPA échoue), `deploy-web` remet `current` sur la release précédente et
le job finit en rouge avec le message « Deployment rolled back ». La release fautive reste sur le
serveur pour analyse.

**Manuel, depuis GitHub** : Actions > **Rollback** > Run workflow (branche `main`) :

- champ `version` vide : retour à la release précédant celle en ligne (ordre semver) ;
- `version` = `1.1.0` : retour à cette release, si elle fait partie des 5 conservées.

Le workflow affiche les releases disponibles, bascule le lien puis lance le health check.

**En urgence, par SSH** :

```bash
ssh deploy@<host>
cd /var/www/moni && ls releases && readlink current
ln -sfn releases/1.1.0 current.tmp && mv -T current.tmp current
```

À savoir :

- un rollback ne change pas le code de `main` : corrige ensuite via un `hotfix/*` et une **nouvelle**
  version ;
- les données de Moni sont stockées dans le navigateur de chaque utilisateur : si la version retirée
  avait migré le format des données locales, l'ancienne version risque de ne plus les lire. Vérifie-le
  avant de revenir en arrière après une migration ;
- les PWA déjà installées récupèrent la version servie à leur prochaine ouverture en ligne
  (`index.html` et `sw.js` ne sont jamais mis en cache par Apache) ;
- le mobile ne se « rollback » pas : publie un hotfix (et, sur le Play Store, suspends le déploiement
  progressif si besoin).
