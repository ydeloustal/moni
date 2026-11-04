/**
 * Strict validation of any data coming from outside (imported file, data read back at startup).
 * A file is NEVER trusted: everything is copied field by field, bounded, and absurd values are dropped.
 */
import { DEFAULT_CATEGORIES } from '@/features/categories/domain/defaults';
import { OCCURRENCE_KEY } from '@/features/budget/domain/keys';
import { PRODUCTS } from '@/features/savings/domain/interest';
import {
  SCHEMA_VERSION,
  type BudgetState,
  type Category,
  type Frequency,
  type Goal,
  type Rule,
  type SavingsAccount,
  type SavingsProduct,
  type Tx,
} from '@/types/domain';
import { isDay, isMonth, monthOf, type Day } from '@/utils/dates';

/** 100 million euros: anything above is a typing error. */
const MAX_CENTS = 100_000_000_00;
export const LIMITS = {
  rules: 2000,
  txs: 50000,
  categories: 100,
  savings: 100,
  movements: 5000,
  goals: 200,
  keys: 100000,
} as const;

const FREQUENCIES: readonly Frequency[] = [1, 2, 3, 6, 12];
const COLOR = /^#[0-9a-f]{6}$/i;

export class NewerDataError extends Error {
  constructor() {
    super("Données créées par une version plus récente de Moni : mets l'application à jour.");
    this.name = 'NewerDataError';
  }
}

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const str = (v: unknown, max: number): string =>
  (typeof v === 'string' ? v : v == null ? '' : String(v))
    .replace(CONTROL_CHARS, ' ')
    .trim()
    .slice(0, max);

const cents = (v: unknown, allowNegative = false): number => {
  const n = typeof v === 'number' ? v : NaN;
  if (!Number.isFinite(n)) return 0;
  const c = Math.round(n);
  const bounded = Math.min(MAX_CENTS, Math.abs(c));
  return allowNegative && c < 0 ? -bounded : bounded;
};

const id = (v: unknown): string | null => str(v, 32).replace(/[^\w-]/g, '') || null;
const pct = (v: unknown): number | null =>
  typeof v === 'number' && v >= 0 && v <= 100 ? Math.round(v * 1000) / 1000 : null;
const arr = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

function uniqueIds<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

/** Throws if the base structure is missing; otherwise returns a clean state. */
export function sanitizeState(raw: unknown, today: Day): BudgetState {
  const s = obj(raw);
  if (
    !Array.isArray(s.rules) ||
    !Array.isArray(s.txs) ||
    !s.settings ||
    typeof s.settings !== 'object'
  ) {
    throw new Error("Ce fichier n'a pas le format des données Moni.");
  }
  if (typeof s.schemaVersion === 'number' && s.schemaVersion > SCHEMA_VERSION)
    throw new NewerDataError();

  let categories: Category[] = uniqueIds(
    arr(s.categories, LIMITS.categories).flatMap(x => {
      const c = obj(x);
      const cid = id(c.id);
      const name = str(c.name, 40);
      if (!cid || !name) return [];
      const color = typeof c.color === 'string' && COLOR.test(c.color) ? c.color : '#788291';
      return [{ id: cid, name, color, need: c.need === true }];
    }),
  );
  if (categories.length === 0) categories = DEFAULT_CATEGORIES.map(c => ({ ...c }));
  const categoryIds = new Set(categories.map(c => c.id));
  const categoryFor = (kind: string, v: unknown): string | null =>
    kind === 'inc' ? null : typeof v === 'string' && categoryIds.has(v) ? v : null;

  const rules: Rule[] = uniqueIds(
    arr(s.rules, LIMITS.rules).flatMap(x => {
      const r = obj(x);
      const rid = id(r.id);
      if (!rid) return [];
      const kind = r.kind === 'inc' ? 'inc' : 'exp';
      const every = FREQUENCIES.find(f => f === r.every) ?? 1;
      const from = isMonth(r.from) ? r.from : null;
      const to = isMonth(r.to) ? r.to : null;
      const swap = from !== null && to !== null && to < from;
      const rule: Rule = {
        id: rid,
        kind,
        name: str(r.name, 80) || 'Sans nom',
        amount: cents(r.amount),
        categoryId: categoryFor(kind, r.categoryId),
        day: Math.min(31, Math.max(1, Math.round(Number(r.day)) || 1)),
        every,
        anchor: isMonth(r.anchor) ? r.anchor : (from ?? monthOf(today)),
        from: swap ? to : from,
        to: swap ? from : to,
        note: str(r.note, 200),
        active: r.active !== false,
        subscription: r.subscription === true,
      };
      return [rule];
    }),
  );

  const txs: Tx[] = uniqueIds(
    arr(s.txs, LIMITS.txs).flatMap(x => {
      const t = obj(x);
      const tid = id(t.id);
      if (!tid || !isDay(t.date)) return [];
      const kind = t.kind === 'inc' ? 'inc' : 'exp';
      const tx: Tx = {
        id: tid,
        kind,
        name: str(t.name, 80) || 'Sans nom',
        amount: cents(t.amount),
        categoryId: categoryFor(kind, t.categoryId),
        date: t.date,
        note: str(t.note, 200),
      };
      return [tx];
    }),
  );

  const savings: SavingsAccount[] = uniqueIds(
    arr(s.savings, LIMITS.savings).flatMap(x => {
      const a = obj(x);
      const aid = id(a.id);
      if (!aid) return [];
      const product: SavingsProduct = PRODUCTS.find(p => p === a.product) ?? 'autre';
      const account: SavingsAccount = {
        id: aid,
        product,
        name: str(a.name, 60),
        bank: str(a.bank, 60),
        balance: cents(a.balance),
        balanceDate: isDay(a.balanceDate) ? a.balanceDate : today,
        customRate: pct(a.customRate),
        rateCheckedOn: isDay(a.rateCheckedOn) ? a.rateCheckedOn : null,
        openedOn: isDay(a.openedOn) ? a.openedOn : null,
        movements: uniqueIds(
          arr(a.movements, LIMITS.movements).flatMap(y => {
            const m = obj(y);
            const mid = id(m.id);
            return mid && isDay(m.date)
              ? [{ id: mid, date: m.date, amount: cents(m.amount, true) }]
              : [];
          }),
        ).sort((p, q) => p.date.localeCompare(q.date)),
      };
      return [account];
    }),
  );

  const goals: Goal[] = uniqueIds(
    arr(s.goals, LIMITS.goals).flatMap(x => {
      const g = obj(x);
      const gid = id(g.id);
      const name = str(g.name, 80);
      return gid && name ? [{ id: gid, name, target: cents(g.target), saved: cents(g.saved) }] : [];
    }),
  );

  const marks: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(obj(s.marks)).slice(0, LIMITS.keys)) {
    if (OCCURRENCE_KEY.test(k)) marks[k] = v === true;
  }
  const paid: Record<string, true> = {};
  for (const [k, v] of Object.entries(obj(s.paid)).slice(0, LIMITS.keys)) {
    if (OCCURRENCE_KEY.test(k) && v === true) paid[k] = true;
  }

  const t = obj(s.settings);
  return {
    schemaVersion: SCHEMA_VERSION,
    rules,
    txs,
    categories,
    savings,
    goals,
    marks,
    paid,
    settings: {
      balance: cents(t.balance, true),
      balanceDate: isDay(t.balanceDate) ? t.balanceDate : today,
      buffer: cents(t.buffer),
      simAltRate: pct(t.simAltRate),
      lastBackupAt: isDay(t.lastBackupAt) ? t.lastBackupAt : null,
    },
  };
}
