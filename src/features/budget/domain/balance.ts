import type { BudgetState } from '@/types/domain';
import { addMonths, dayInMonth, monthOf, type Day } from '@/utils/dates';
import type { Cents } from '@/utils/money';
import { ruleKey, txKey } from './keys';
import {
  inAnchor,
  monthStatus,
  resolveKey,
  ruleOccursIn,
  signOf,
  type OccurrenceStatus,
} from './occurrences';

export const baseMonth = (state: BudgetState): string => monthOf(state.settings.balanceDate);

/** Current balance = typed balance + what was ticked as paid since (and was not already in the balance). */
export function currentBalance(state: BudgetState): Cents {
  let balance = state.settings.balance;
  for (const key of Object.keys(state.paid)) {
    const o = resolveKey(state, key);
    if (o && !inAnchor(state, o)) balance += o.sign * o.amount;
  }
  return balance;
}

export function paidSinceCount(state: BudgetState): number {
  let n = 0;
  for (const key of Object.keys(state.paid)) {
    const o = resolveKey(state, key);
    if (o && !inAnchor(state, o)) n++;
  }
  return n;
}

/** Occurrences that should have gone through between the balance date and today, and are not ticked. */
export function overdue(state: BudgetState, today: Day): OccurrenceStatus[] {
  if (today < state.settings.balanceDate) return [];
  const out: OccurrenceStatus[] = [];
  for (let m = baseMonth(state); m <= monthOf(today); m = addMonths(m, 1)) {
    for (const o of monthStatus(state, m)) {
      if (!o.done && o.date > state.settings.balanceDate && o.date <= today) out.push(o);
    }
  }
  return out;
}

export interface BalanceCandidate {
  key: string;
  date: Day;
  name: string;
  amount: Cents;
  sign: 1 | -1;
  /** Suggested tick: the occurrence is dated on or before the new balance date. */
  defaultIncluded: boolean;
}

/** Occurrences to offer in "Update my balance": from the month of the old balance to the month of the new date. */
export function balanceCandidates(state: BudgetState, newDate: Day): BalanceCandidate[] {
  const out: BalanceCandidate[] = [];
  const oldMonth = monthOf(state.settings.balanceDate);
  const newMonth = monthOf(newDate);
  const start = oldMonth < newMonth ? oldMonth : newMonth;
  for (let m = start; m <= newMonth; m = addMonths(m, 1)) {
    for (const rule of state.rules) {
      if (!ruleOccursIn(rule, m)) continue;
      const date = dayInMonth(m, rule.day);
      if (m < newMonth && date <= state.settings.balanceDate) continue;
      out.push({
        key: ruleKey(rule.id, m),
        date,
        name: rule.name,
        amount: rule.amount,
        sign: signOf(rule.kind),
        defaultIncluded: date <= newDate,
      });
    }
    for (const tx of state.txs) {
      if (monthOf(tx.date) !== m) continue;
      if (m < newMonth && tx.date <= state.settings.balanceDate) continue;
      out.push({
        key: txKey(tx.id),
        date: tx.date,
        name: tx.name,
        amount: tx.amount,
        sign: signOf(tx.kind),
        defaultIncluded: tx.date <= newDate,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || b.sign - a.sign);
}

/**
 * Expected balance for a new balance date, given the ticks, before the user types the real one.
 * The difference with the real balance is the "gap" shown to the user.
 */
export function expectedBalance(
  state: BudgetState,
  candidates: readonly BalanceCandidate[],
  included: Readonly<Record<string, boolean>>,
): Cents {
  let balance = currentBalance(state);
  for (const c of candidates) {
    const o = resolveKey(state, c.key);
    if (!o) continue;
    const alreadyCounted = inAnchor(state, o) || state.paid[c.key] === true;
    const nowIncluded = included[c.key] ?? c.defaultIncluded;
    if (nowIncluded && !alreadyCounted) balance += c.sign * c.amount;
    if (!nowIncluded && alreadyCounted) balance -= c.sign * c.amount;
  }
  return balance;
}
