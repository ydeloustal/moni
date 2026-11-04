/**
 * Savings: applicable rate of an account and interest estimate with the fortnight rule.
 *
 * Official rule (Service-Public.fr, Livret A): interest is computed per fortnight (the 1st and the 16th of each month).
 *  - a deposit starts earning on the NEXT fortnight (deposit on May 1–15 → counted from May 16);
 *  - a withdrawal stops earning from the start of the current fortnight;
 *  - the year's interest is added to the capital on December 31.
 * Bank accounts often apply the same rule, but not always: the result remains an ESTIMATE.
 */
import type { SavingsAccount, SavingsProduct } from '@/types/domain';
import { daysBetween, type Day } from '@/utils/dates';
import type { Cents } from '@/utils/money';
import { rateAt, type RateLookup, type RatesFile } from './rates';

export const PRODUCT_LABELS: Record<SavingsProduct, string> = {
  'livret-a': 'Livret A',
  ldds: 'LDDS',
  lep: 'LEP',
  cel: 'Compte épargne logement (CEL)',
  pel: 'Plan épargne logement (PEL)',
  'livret-jeune': 'Livret jeune',
  'livret-bancaire': 'Livret bancaire',
  autre: 'Autre épargne',
};

export const PRODUCTS: readonly SavingsProduct[] = [
  'livret-a',
  'ldds',
  'lep',
  'cel',
  'pel',
  'livret-jeune',
  'livret-bancaire',
  'autre',
];

/** Products whose rate is typed by the user. */
export const usesCustomRate = (p: SavingsProduct): boolean =>
  p === 'livret-jeune' || p === 'livret-bancaire' || p === 'autre';

export interface AccountRate extends RateLookup {
  /** Where the rate comes from: official scale, user input, or nothing. */
  origin: 'regulated' | 'custom' | 'none';
  /** Livret jeune: typed rate below the legal floor (Livret A). */
  belowFloor?: boolean;
}

function customRate(rate: number | null): AccountRate {
  return {
    status: rate === null ? 'unknown' : 'ok',
    rate,
    entry: null,
    source: null,
    last: null,
    origin: rate === null ? 'none' : 'custom',
  };
}

/** Rate applicable to an account at a given date. */
export function accountRateAt(file: RatesFile, account: SavingsAccount, date: Day): AccountRate {
  switch (account.product) {
    case 'livret-a':
    case 'ldds':
    case 'lep':
    case 'cel':
      return { ...rateAt(file, account.product, date), origin: 'regulated' };
    case 'pel': {
      if (!account.openedOn) return customRate(account.customRate);
      const lookup = rateAt(file, 'pel', account.openedOn);
      // A PEL keeps the rate of its generation: it never "expires".
      return lookup.status === 'ok'
        ? { ...lookup, origin: 'regulated' }
        : customRate(account.customRate);
    }
    case 'livret-jeune': {
      const floor = rateAt(file, 'livret-a', date);
      const r = customRate(account.customRate);
      return { ...r, belowFloor: r.rate !== null && floor.rate !== null && r.rate < floor.rate };
    }
    case 'livret-bancaire':
    case 'autre':
      return customRate(account.customRate);
  }
}

/** Fortnight index in the year (0 = Jan 1–15 … 23 = Dec 16–31). */
export const fortnightOf = (d: Day): number =>
  (Number(d.slice(5, 7)) - 1) * 2 + (Number(d.slice(8)) >= 16 ? 1 : 0);

/** First day of a fortnight. */
export const fortnightStart = (year: number, q: number): Day =>
  `${year}-${String(Math.floor(q / 2) + 1).padStart(2, '0')}-${q % 2 ? '16' : '01'}`;

export interface InterestEstimate {
  /** Estimated interest for the calendar year, in cents (credited on December 31). */
  interest: Cents;
  /** Estimated balance on December 31, interest included. */
  endBalance: Cents;
  /** Fortnights without a known rate (revision not published, or rate not typed). */
  missingFortnights: number;
  /** The balance before the typed date is assumed constant (history unknown). */
  assumedConstantBefore: boolean;
}

/** Estimates the interest of a calendar year. */
export function estimateInterest(
  file: RatesFile,
  account: SavingsAccount,
  year: number,
): InterestEstimate {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  let base = account.balance;
  const moves = account.movements.filter(m => m.date > account.balanceDate);
  const effective = new Array<number>(24).fill(0);
  for (const m of moves) {
    if (m.date > yearEnd) continue;
    if (m.date < yearStart) {
      base += m.amount;
      continue;
    }
    const q = fortnightOf(m.date);
    // Deposit: next fortnight. Withdrawal: current fortnight.
    const valueQ = m.amount >= 0 ? q + 1 : q;
    if (valueQ < 24) effective[valueQ] = (effective[valueQ] ?? 0) + m.amount;
  }
  let running = base;
  let exact = 0;
  let missing = 0;
  for (let q = 0; q < 24; q++) {
    running += effective[q] ?? 0;
    const r = accountRateAt(file, account, fortnightStart(year, q));
    if (r.rate === null) {
      missing++;
      continue;
    }
    // cents × % / 100 / 24 fortnights; full precision kept until the final rounding.
    exact += (Math.max(0, running) * r.rate) / 100 / 24;
  }
  const interest = Math.round(exact);
  const yearMoves = moves
    .filter(m => m.date >= yearStart && m.date <= yearEnd)
    .reduce((sum, m) => sum + m.amount, 0);
  return {
    interest,
    endBalance: base + yearMoves + interest,
    missingFortnights: missing,
    assumedConstantBefore: account.balanceDate > yearStart,
  };
}

/** Estimated current balance (typed balance + movements until today, excluding this year's interest). */
export function savingsBalance(account: SavingsAccount, today: Day): Cents {
  return account.movements
    .filter(m => m.date > account.balanceDate && m.date <= today)
    .reduce((sum, m) => sum + m.amount, account.balance);
}

/** Ceiling check (deposits cannot exceed the ceiling; interest can). */
export function ceilingInfo(
  file: RatesFile,
  account: SavingsAccount,
  today: Day,
): { ceiling: Cents; over: boolean; room: Cents } | null {
  const p = file.products[account.product];
  if (!p || p.ceiling === null) return null;
  const balance = savingsBalance(account, today);
  return { ceiling: p.ceiling, over: balance > p.ceiling, room: Math.max(0, p.ceiling - balance) };
}

/** Reminder period for a user-typed bank rate (≈ 6 months). */
export const RATE_CHECK_DAYS = 183;

/** The typed bank rate has not been checked for more than `days` days. */
export function customRateNeedsCheck(
  account: SavingsAccount,
  today: Day,
  days = RATE_CHECK_DAYS,
): boolean {
  if (account.customRate === null || !usesCustomRate(account.product)) return false;
  if (!account.rateCheckedOn) return true;
  return daysBetween(account.rateCheckedOn, today) > days;
}
