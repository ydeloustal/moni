# Moni

Personal budget app for France — **100 % local**: no account, no server, no tracker. All data stays on the
user's device (iOS, Android) or in their browser (web).

- Recurring income and expenses (monthly to yearly, cut lines, change "from a given month"), one-off operations
- Bank balance reconciliation without double counting, remaining budget, spendable per day, end-of-month forecast
- 12-month forecast and prudent savings plan (never below a safety margin)
- History and statistics, categories (need / want), subscriptions
- French regulated savings (Livret A, LDDS, LEP, CEL, PEL, Livret jeune) with dated and sourced rates and
  fortnight-based interest estimates; bank accounts with a user-typed rate
- Goals and simulator, general benchmarks (never investment advice)
- Encrypted `.moni` backup (Argon2id + XChaCha20-Poly1305), JSON / CSV exports, import (including the legacy PHP version)

Functional specification: [docs/CAHIER_DES_CHARGES.md](docs/CAHIER_DES_CHARGES.md) (French).

## Requirements

- Node.js 24 LTS and npm
- For native builds: an [Expo](https://expo.dev) account and EAS CLI (`npx eas-cli@latest`), or Android Studio /
  Xcode for local builds
- Optional: Android emulator or device, iOS simulator (macOS only)

```bash
npm ci
```

## Run

| Platform | Command                                        | Notes                                                                             |
| -------- | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| Web      | `npm run web`                                  | Opens http://localhost:8081                                                       |
| Android  | `APP_VARIANT=development npx expo run:android` | Development build (Metro needs the INTERNET permission, kept only in development) |
| iOS      | `APP_VARIANT=development npx expo run:ios`     | macOS + Xcode required                                                            |

Expo Go is not supported: the app uses native modules (SQLite) and blocks permissions that Expo Go requires. Use a
development build (`eas build --profile development`) or `expo run:*`.

Set `EXPO_NO_TELEMETRY=1` to disable Expo CLI usage statistics on your machine (already set in CI and EAS profiles).

## Quality

```bash
npm run typecheck     # TypeScript (strict)
npm run lint          # ESLint + Prettier, zero warning allowed
npm run test          # Jest + React Native Testing Library
npm run check         # everything above + coverage + rates freshness
npx expo-doctor       # dependency and configuration checks
```

The storage tests run the real SQL schema (Node's built-in `node:sqlite`) and the real IndexedDB code
(`fake-indexeddb`), including migrations, recovery and data persistence across restarts.

## Architecture

```
app/                     Routes (Expo Router): (tabs)/ + modal windows. Thin: they re-export feature screens.
src/
  features/<feature>/
    domain/              Pure business logic (no React, no clock, no storage) + unit tests
    forms/               Form values ↔ domain input, validation (pure, tested)
    screens/ components/ UI of the feature
  services/
    storage/             BudgetRepository interface
                         ├─ repository.native.ts  → SQLite (expo-sqlite), versioned migrations (PRAGMA user_version)
                         └─ repository.web.ts     → IndexedDB (Dexie), versioned schema
    store/               App state: commit(fn) with pure functions, one-level undo, debounced atomic saves
    preferences/         Simple preferences (AsyncStorage / localStorage)
    files/               Export (share sheet / download) and import (document picker), no network
    pwa/                 Service worker registration (web, production only)
  components/            Reusable accessible components and SVG charts
  hooks/  theme/  types/  utils/
public/                  Web: index.html template, manifest, icons
scripts/                 build-pwa.mjs (service worker + CSP), check-rates.mjs, serve-dist.mjs
```

Key rules:

1. **Amounts are integer cents** everywhere; computations never use float euros.
2. **`src/features/*/domain` is pure**: today's date is a parameter, everything is unit tested. Parity with the
   legacy PHP algorithm is checked to the cent on 300 random budgets.
3. **State changes only go through `commit(fn)`** with a pure function: undo is trivial, and only the changed rows are
   written, in one transaction.
4. **Everything coming from outside is validated** (`sanitizeState`): imported files, data read back at startup,
   bundled rates (`parseRatesFile`). Imports are limited to 20 MB.
5. **Nothing is erased implicitly.** At startup, unreadable data falls back to the newest known-good snapshot
   (3 kept); otherwise a screen offers to restore a backup. Data written by a newer app version is never opened.

### Data schema changes

- Native: append a migration to `src/services/storage/sqlite/migrations.ts` (never edit a published one).
- Web: add `this.version(n + 1).stores(...).upgrade(...)` in `src/services/storage/indexedDbRepository.ts`.
- Backup/export format: bump `SCHEMA_VERSION` in `src/types/domain.ts` and convert old data in `sanitizeState`.
- Add a test for each migration.

## Privacy and network

Moni makes **no network call at runtime** on any platform. See [docs/NETWORK_AUDIT.md](docs/NETWORK_AUDIT.md).

- No backend, API, analytics, crash reporting or OTA updates (`expo-updates` is not installed, `updates.enabled: false`).
- Android production builds block every permission, `INTERNET` included.
- Web: a Content-Security-Policy with `connect-src 'none'` makes the browser refuse any request issued by the page.
- Fonts (system fonts), icons (inline SVG) and images are bundled.

Privacy policy for the stores: [docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md).

## Regulated rates

Rates are bundled in `src/features/savings/data/regulated.json`, each with its validity period and source. They are
revised twice a year: see [docs/RATES.md](docs/RATES.md). `npm run rates:check` (run weekly by the CI) fails when an
expected revision has passed.

## Builds with EAS

`eas.json` defines three profiles:

| Profile       | Purpose                                                                             | Output                      |
| ------------- | ----------------------------------------------------------------------------------- | --------------------------- |
| `development` | Debug build loading JS from Metro (`APP_VARIANT=development`, id `fr.moni.app.dev`) | Android APK / iOS simulator |
| `preview`     | Internal testing of the production configuration                                    | Android APK, iOS ad hoc     |
| `production`  | Store release (auto-incremented build numbers)                                      | Android AAB, iOS IPA        |

```bash
npx eas-cli@latest login
npx eas-cli@latest init                       # links the project, writes extra.eas.projectId
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile production --platform all
```

EAS manages the signing credentials (Android keystore, iOS certificates and profiles). **Never commit a keystore,
certificate or `.env` file** (they are git-ignored).

## Publishing

### Google Play

1. Create a Google Play developer account and the app (`fr.moni.app` — final once published).
2. First upload: `eas build --profile production --platform android`, then upload the `.aab` manually in the Play
   Console (or `eas submit --platform android` once a service account key is configured in EAS).
3. Store listing: description, screenshots (phone, 7" and 10" tablets), 512×512 icon, 1024×500 feature graphic.
4. **Data safety**: "No data collected", "No data shared". Privacy policy URL: host `docs/PRIVACY_POLICY.md`.
5. Personal accounts: closed testing with at least 12 testers for 14 days before production.

### App Store

1. Apple Developer Program membership, then create the app in App Store Connect (`fr.moni.app`).
2. `eas build --profile production --platform ios`, then `eas submit --platform ios`.
3. **App Privacy**: "Data Not Collected". Privacy policy URL required.
4. Export compliance: the app encrypts the user's own backups with standard algorithms; answer the encryption
   questions in App Store Connect accordingly (then set `ios.config.usesNonExemptEncryption` in `app.config.ts`).
5. Screenshots: 6.9" and 6.5" iPhone, 13" iPad.

### Web (static hosting)

```bash
npm run build:web         # expo export --platform web + service worker + CSP → dist/
npm run serve:web         # local check on http://localhost:8090
```

Deploy the content of `dist/` to any static host (nginx, Caddy, Netlify, GitHub Pages…), with:

- an SPA fallback to `/index.html`,
- `Cache-Control: no-cache` on `index.html` and `sw.js`, long-term caching on `/_expo/static/*`,
- HTTPS (required for the service worker and persistent storage).

Example nginx configuration:

```nginx
server {
  listen 443 ssl http2;
  server_name moni.example;
  root /var/www/moni/current;
  access_log off;

  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'" always;
  add_header X-Content-Type-Options nosniff always;
  add_header Referrer-Policy no-referrer always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

  location = /sw.js { add_header Cache-Control "no-cache"; }
  location = /index.html { add_header Cache-Control "no-cache"; }
  location /_expo/static/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
  location / { try_files $uri /index.html; }
}
```

Keeping one folder per version and pointing `current` to it with a symbolic link allows an instant rollback.

## License

Proprietary — all rights reserved (see `LICENSE`). The choice of an open-source license (AGPL-3.0 or MPL-2.0) is
pending.
