# Regulated savings rates

Rates live in `src/features/savings/data/regulated.json` and are **bundled with the app** (no download). Each rate
has a validity period (`from` / `to`), a source (`officielle` or `secondaire`) and a verification date
(`verifiedAt`). The file is validated at startup (`parseRatesFile`) and by the tests.

Rules enforced by the code:

- A rate is never shown as current outside its validity period: past the last known period the status is
  `expired`, and fortnights without a known rate are reported, never invented.
- `nextRevision` is the next expected revision (usually 1 February and 1 August). Once passed without an update, the
  app shows a warning and `npm run rates:check` fails (run every Monday by the CI).
- Plausibility: rates within [0; 10] %, no overlapping periods, https sources only.

## Update procedure (twice a year)

1. Around 15 January / 15 July, the Banque de France publishes its computation and the minister announces the rates.
2. Wait for the **arrêté in the Journal officiel** (Légifrance, search "taux d'intérêt des produits d'épargne
   réglementée"). The LEP may have a separate arrêté.
3. In `regulated.json`: close the current period (`to`), add the new one (`from`, `to`, `rate`, `source`,
   `verifiedAt`), add the source to `sources`, update `updatedAt` and `nextRevision`.
4. `npm run check`, review by a second person if possible, commit (`feat(savings): update regulated rates for …`).
5. Release a new version of the app (stores and web).

Bank accounts ("livrets bancaires", "super livrets") have free rates typed by the user, with a reminder after 6 months.
