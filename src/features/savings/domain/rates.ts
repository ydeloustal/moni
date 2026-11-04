/**
 * Regulated savings rates: validation and lookup of a rate at a date.
 *
 * Golden rule: a rate is NEVER displayed as "current" without its source and validity period.
 * When the date is past the last known period, the status is "expired" and the UI must say so.
 * Rates are bundled with the app (no network): a new release ships new rates.
 */
import type { SavingsProduct } from '@/types/domain';
import type { Day } from '@/utils/dates';
import type { Cents } from '@/utils/money';

export type Evidence = 'officielle' | 'secondaire';

export interface RateSource {
  title: string;
  url: string;
  evidence: Evidence;
}

export interface RateEntry {
  from: Day;
  to: Day | null;
  rate: number;
  source: string;
  verifiedAt: Day;
}

export interface ProductRates {
  label: string;
  ceiling: Cents | null;
  ceilingSource?: string;
  taxFree: boolean;
  /** PEL: the rate depends on the opening date and stays fixed afterwards. */
  byOpeningDate?: boolean;
  /** Livret jeune: free rate but at least the rate of this product. */
  floorOf?: string;
  rates: RateEntry[];
}

export interface RatesFile {
  schema: 1;
  updatedAt: Day;
  nextRevision: Day | null;
  notice?: string;
  sources: Record<string, RateSource>;
  products: Record<string, ProductRates>;
}

export const REGULATED: readonly SavingsProduct[] = ['livret-a', 'ldds', 'lep', 'cel', 'pel'];
export const isRegulated = (p: SavingsProduct): boolean => REGULATED.includes(p);

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Validates a rates file. Throws an explicit error otherwise. */
export function parseRatesFile(raw: unknown): RatesFile {
  const fail = (message: string): never => {
    throw new Error('Fichier de taux invalide : ' + message);
  };
  if (!isRecord(raw) || raw.schema !== 1) return fail('schéma inconnu');
  if (typeof raw.updatedAt !== 'string' || !DAY.test(raw.updatedAt)) fail('updatedAt');
  if (
    raw.nextRevision !== null &&
    !(typeof raw.nextRevision === 'string' && DAY.test(raw.nextRevision))
  ) {
    fail('nextRevision');
  }
  if (!isRecord(raw.sources)) return fail('sources');
  for (const [id, s] of Object.entries(raw.sources)) {
    if (
      !isRecord(s) ||
      typeof s.title !== 'string' ||
      typeof s.url !== 'string' ||
      !/^https:\/\//.test(s.url) ||
      (s.evidence !== 'officielle' && s.evidence !== 'secondaire')
    ) {
      fail('source ' + id);
    }
  }
  const sources = raw.sources;
  if (!isRecord(raw.products)) return fail('products');
  for (const [id, p] of Object.entries(raw.products)) {
    if (!isRecord(p) || typeof p.label !== 'string' || !Array.isArray(p.rates))
      return fail('produit ' + id);
    if (p.ceiling !== null && !(Number.isInteger(p.ceiling) && Number(p.ceiling) > 0))
      fail('plafond ' + id);
    let previousTo: string | null = null;
    for (const r of p.rates as unknown[]) {
      if (!isRecord(r)) return fail(`taux ${id}`);
      const from = String(r.from);
      // Plausibility bounds: a regulated rate outside [0; 10] % is necessarily a typing error.
      if (
        !DAY.test(from) ||
        (r.to !== null && !(typeof r.to === 'string' && DAY.test(r.to))) ||
        typeof r.rate !== 'number' ||
        !(r.rate >= 0 && r.rate <= 10)
      ) {
        fail(`taux ${id} ${from}`);
      }
      if (typeof r.to === 'string' && r.to < from) fail(`période ${id} ${from}`);
      if (typeof r.source !== 'string' || !sources[r.source])
        fail(`source manquante ${id} ${from}`);
      if (typeof r.verifiedAt !== 'string' || !DAY.test(r.verifiedAt))
        fail(`verifiedAt ${id} ${from}`);
      if (previousTo !== null && from <= previousTo)
        fail(`périodes qui se chevauchent ${id} ${from}`);
      previousTo = typeof r.to === 'string' ? r.to : '9999-12-31';
    }
  }
  return raw as unknown as RatesFile;
}

export type RateStatus =
  /** Known and sourced rate for this date. */
  | 'ok'
  /** The date is past the last known period: revision not recorded yet. */
  | 'expired'
  /** No known rate for this date (before history, or product without an official rate). */
  | 'unknown';

export interface RateLookup {
  status: RateStatus;
  rate: number | null;
  entry: RateEntry | null;
  source: RateSource | null;
  /** Last known rate (shown with a warning when `expired`). */
  last: RateEntry | null;
}

export function rateAt(file: RatesFile, product: string, date: Day): RateLookup {
  const p = file.products[product];
  const last = p?.rates[p.rates.length - 1];
  if (!p || !last) return { status: 'unknown', rate: null, entry: null, source: null, last: null };
  const entry = p.rates.find(r => r.from <= date && (r.to === null || date <= r.to)) ?? null;
  if (entry) {
    return {
      status: 'ok',
      rate: entry.rate,
      entry,
      source: file.sources[entry.source] ?? null,
      last,
    };
  }
  if (date > (last.to ?? '9999-12-31')) {
    return {
      status: 'expired',
      rate: null,
      entry: null,
      source: file.sources[last.source] ?? null,
      last,
    };
  }
  return { status: 'unknown', rate: null, entry: null, source: null, last };
}

/** Is the data likely outdated? (expected revision date passed) */
export function isStale(file: RatesFile, today: Day): boolean {
  return (
    file.nextRevision !== null && today >= file.nextRevision && file.updatedAt < file.nextRevision
  );
}
