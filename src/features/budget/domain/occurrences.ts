/**
 * Budget computations. PURE functions: (state, today) → result. No clock, no storage.
 *
 * Principle (inherited from the PHP version and generalised):
 *  - The typed balance (settings.balance) is the truth at settings.balanceDate.
 *  - An occurrence (a recurring rule in a given month, or a one-off operation) is "in the balance" when it is
 *    ticked in "Update my balance" (marks) or, without a tick, when its date ≤ balance date.
 *  - A "paid since" occurrence (paid) moved the account AFTER the balance was typed.
 *  - Projections only count occurrences that are neither in the balance nor paid: nothing is counted twice.
 */
import type { BudgetState, Kind, Rule, Tx } from '@/types/domain';
import { dayInMonth, monthOf, monthsBetween, type Day, type Month } from '@/utils/dates';
import type { Cents } from '@/utils/money';
import { isTxKey, parseRuleKey, ruleKey, txKey } from './keys';

export interface Occurrence {
  key: string;
  source: 'rule' | 'tx';
  id: string;
  kind: Kind;
  name: string;
  amount: Cents;
  categoryId: string | null;
  date: Day;
  month: Month;
  sign: 1 | -1;
  note: string;
  subscription: boolean;
}

export interface OccurrenceStatus extends Occurrence {
  /** Already included in the typed balance. */
  inAnchor: boolean;
  /** Ticked as gone through the account since the balance was typed. */
  paid: boolean;
  done: boolean;
  /** In the balance without a "paid" tick: can only be unticked by updating the balance. */
  locked: boolean;
}

export interface Totals {
  inc: Cents;
  exp: Cents;
  rest: Cents;
}

const mod = (a: number, n: number): number => ((a % n) + n) % n;
export const signOf = (kind: Kind): 1 | -1 => (kind === 'inc' ? 1 : -1);

/** Does the rule fall in this month? (bounds + frequency; `ignoreActive` for simulations) */
export function ruleOccursIn(rule: Rule, month: Month, ignoreActive = false): boolean {
  if (!ignoreActive && !rule.active) return false;
  if (rule.from && month < rule.from) return false;
  if (rule.to && month > rule.to) return false;
  return mod(monthsBetween(rule.anchor, month), rule.every) === 0;
}

export function ruleOccurrence(rule: Rule, month: Month): Occurrence {
  return {
    key: ruleKey(rule.id, month),
    source: 'rule',
    id: rule.id,
    kind: rule.kind,
    name: rule.name,
    amount: rule.amount,
    categoryId: rule.categoryId,
    date: dayInMonth(month, rule.day),
    month,
    sign: signOf(rule.kind),
    note: rule.note,
    subscription: rule.subscription,
  };
}

export function txOccurrence(tx: Tx): Occurrence {
  return {
    key: txKey(tx.id),
    source: 'tx',
    id: tx.id,
    kind: tx.kind,
    name: tx.name,
    amount: tx.amount,
    categoryId: tx.categoryId,
    date: tx.date,
    month: monthOf(tx.date),
    sign: signOf(tx.kind),
    note: tx.note,
    subscription: false,
  };
}

/**
 * Index computed once per state (states are immutable: a new object on every change).
 * Avoids walking every operation for each month or each tick.
 */
interface StateIndex {
  rules: Map<string, Rule>;
  txs: Map<string, Tx>;
  txsByMonth: Map<Month, Tx[]>;
}
const indexes = new WeakMap<BudgetState, StateIndex>();

function indexOf(state: BudgetState): StateIndex {
  let index = indexes.get(state);
  if (!index) {
    const txsByMonth = new Map<Month, Tx[]>();
    for (const tx of state.txs) {
      const m = monthOf(tx.date);
      const list = txsByMonth.get(m);
      if (list) list.push(tx);
      else txsByMonth.set(m, [tx]);
    }
    index = {
      rules: new Map(state.rules.map(r => [r.id, r])),
      txs: new Map(state.txs.map(t => [t.id, t])),
      txsByMonth,
    };
    indexes.set(state, index);
  }
  return index;
}

export const txsOfMonth = (state: BudgetState, month: Month): readonly Tx[] =>
  indexOf(state).txsByMonth.get(month) ?? [];

const byDate = (a: Occurrence, b: Occurrence): number =>
  a.date.localeCompare(b.date) || b.sign - a.sign || a.name.localeCompare(b.name);

/** Every occurrence of a month (active rules + one-off operations), sorted by date, income first. */
export function occurrences(state: BudgetState, month: Month): Occurrence[] {
  const out: Occurrence[] = [];
  for (const rule of state.rules)
    if (ruleOccursIn(rule, month)) out.push(ruleOccurrence(rule, month));
  for (const tx of txsOfMonth(state, month)) out.push(txOccurrence(tx));
  return out.sort(byDate);
}

export function inAnchor(state: BudgetState, occurrence: Occurrence): boolean {
  const mark = state.marks[occurrence.key];
  return mark !== undefined ? mark : occurrence.date <= state.settings.balanceDate;
}

export function withStatus(state: BudgetState, occurrence: Occurrence): OccurrenceStatus {
  const anchored = inAnchor(state, occurrence);
  const paid = state.paid[occurrence.key] === true;
  return {
    ...occurrence,
    inAnchor: anchored,
    paid,
    done: anchored || paid,
    locked: anchored && !paid,
  };
}

export const monthStatus = (state: BudgetState, month: Month): OccurrenceStatus[] =>
  occurrences(state, month).map(o => withStatus(state, o));

/** Finds the occurrence of a key (null if the line no longer exists, is cut, or does not fall that month). */
export function resolveKey(state: BudgetState, key: string): Occurrence | null {
  if (isTxKey(key)) {
    const tx = indexOf(state).txs.get(key.slice(2));
    return tx ? txOccurrence(tx) : null;
  }
  const parsed = parseRuleKey(key);
  if (!parsed) return null;
  const rule = indexOf(state).rules.get(parsed.ruleId);
  return rule && ruleOccursIn(rule, parsed.month) ? ruleOccurrence(rule, parsed.month) : null;
}

export function totalsOf(list: readonly Occurrence[]): Totals {
  let inc = 0;
  let exp = 0;
  for (const o of list) {
    if (o.kind === 'inc') inc += o.amount;
    else exp += o.amount;
  }
  return { inc, exp, rest: inc - exp };
}

/** Income, expenses and rest of a month (everything, gone through or not). */
export const monthTotals = (state: BudgetState, month: Month): Totals =>
  totalsOf(occurrences(state, month));
