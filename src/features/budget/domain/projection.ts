import type { BudgetState } from '@/types/domain';
import {
  daysIn,
  dayOfMonth,
  monthOf,
  monthRange,
  monthsBetween,
  type Day,
  type Month,
} from '@/utils/dates';
import type { Cents } from '@/utils/money';
import { baseMonth, currentBalance } from './balance';
import { monthStatus, monthTotals } from './occurrences';

/** What is left to go through the account this month (signed). */
export const pendingFlow = (state: BudgetState, month: Month): Cents =>
  monthStatus(state, month)
    .filter(o => !o.done)
    .reduce((sum, o) => sum + o.sign * o.amount, 0);

export interface PlanRow {
  month: Month;
  /** What is left to go through that month (signed). */
  flow: Cents;
  /** Rest of the whole month (income − expenses). */
  rest: Cents;
  /** Expected end-of-month balance, without savings. */
  endBalance: Cents;
  /** Amount that can be saved that month without ever going below the margin, now or later. */
  save: Cents;
  savedCumul: Cents;
  /** Account balance at the end of the month when following the savings plan. */
  cash: Cents;
}

/**
 * Projection over `count` months from the balance month, with a prudent savings plan:
 * money is only set aside if it never takes the account below the margin, now or in the following months.
 */
export function projection(state: BudgetState, count = 12): PlanRow[] {
  const months = monthRange(baseMonth(state), count);
  const flows = months.map(m => pendingFlow(state, m));
  const rests = months.map(m => monthTotals(state, m).rest);
  const ends: Cents[] = [];
  let balance = currentBalance(state);
  for (const flow of flows) {
    balance += flow;
    ends.push(balance);
  }
  // Lowest balance from month k to the end of the horizon.
  const minAhead = new Array<Cents>(ends.length);
  let low = Infinity;
  for (let k = ends.length - 1; k >= 0; k--) {
    low = Math.min(low, ends[k] ?? 0);
    minAhead[k] = low;
  }
  let saved = 0;
  return months.map((month, k) => {
    const end = ends[k] ?? 0;
    const save = Math.max(0, (minAhead[k] ?? 0) - saved - state.settings.buffer);
    saved += save;
    return {
      month,
      flow: flows[k] ?? 0,
      rest: rests[k] ?? 0,
      endBalance: end,
      save,
      savedCumul: saved,
      cash: end - saved,
    };
  });
}

/** "Spendable per day" until the end of month `month`, without going below zero. */
export function perDay(
  state: BudgetState,
  month: Month,
  today: Day,
): { amount: Cents; days: number } {
  const plan = projection(state, Math.max(1, monthsBetween(baseMonth(state), month) + 1));
  const row = plan[plan.length - 1];
  const dim = daysIn(month);
  if (!row) return { amount: 0, days: dim };
  if (month === monthOf(today) && month >= baseMonth(state)) {
    const days = dim - dayOfMonth(today) + 1;
    return { amount: Math.max(0, Math.floor(row.endBalance / Math.max(1, days))), days };
  }
  return { amount: Math.max(0, Math.floor(row.rest / dim)), days: dim };
}

/** Expected balance day by day over month `month` (for the chart). */
export function dailyBalance(
  state: BudgetState,
  month: Month,
  today: Day,
): { day: number; balance: Cents }[] {
  const base = baseMonth(state);
  if (month < base) return [];
  const plan = projection(state, monthsBetween(base, month) + 1);
  const start = month === base ? currentBalance(state) : (plan[plan.length - 2]?.endBalance ?? 0);
  let firstDay = 1;
  if (month === base) {
    const ref =
      today > state.settings.balanceDate && monthOf(today) === month
        ? today
        : state.settings.balanceDate;
    firstDay = dayOfMonth(ref);
  }
  const pending = monthStatus(state, month).filter(o => !o.done);
  const points = [{ day: firstDay, balance: start }];
  let balance = start;
  for (let d = firstDay + 1; d <= daysIn(month); d++) {
    // An overdue occurrence (dated on or before the first day) falls on the next day.
    for (const o of pending)
      if (Math.max(firstDay + 1, dayOfMonth(o.date)) === d) balance += o.sign * o.amount;
    points.push({ day: d, balance });
  }
  return points;
}
