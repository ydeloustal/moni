#!/usr/bin/env node
/**
 * Freshness check of the bundled regulated rates (offline: reads the local file only).
 * Fails when the expected revision date has passed without an update, so that a new release
 * with the new rates is prepared. Run weekly by the CI.
 */
import { readFileSync } from 'node:fs';

const file = JSON.parse(
  readFileSync(new URL('../src/features/savings/data/regulated.json', import.meta.url), 'utf8'),
);
const today = new Date().toISOString().slice(0, 10);

if (file.nextRevision && today >= file.nextRevision && file.updatedAt < file.nextRevision) {
  console.error(
    `Rates are stale: revision expected on ${file.nextRevision}, file updated on ${file.updatedAt}. ` +
      'Update src/features/savings/data/regulated.json from the Journal officiel (see docs/RATES.md).',
  );
  process.exit(1);
}
console.log(
  `Rates OK: updated on ${file.updatedAt}, next revision expected on ${file.nextRevision ?? 'n/a'}.`,
);
