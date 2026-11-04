import { categoryOf } from '@/features/categories/domain/defaults';
import { monthTotals, occurrences, type Totals } from '@/features/budget/domain/occurrences';
import type { BudgetState, Category } from '@/types/domain';
import { addMonths, monthRange, type Month } from '@/utils/dates';
import type { Cents } from '@/utils/money';

export interface HistoryRow extends Totals {
  month: Month;
}

/** Income / expenses / rest of the `count` months ending with `end` (included). */
export function history(state: BudgetState, end: Month, count: number): HistoryRow[] {
  return monthRange(addMonths(end, -(count - 1)), count).map(month => ({
    month,
    ...monthTotals(state, month),
  }));
}

/** Income / expenses / rest of the `count` months starting with `start` (included). */
export function forecastRows(state: BudgetState, start: Month, count: number): HistoryRow[] {
  return monthRange(start, count).map(month => ({ month, ...monthTotals(state, month) }));
}

export function averages(rows: readonly HistoryRow[]): Totals {
  const n = Math.max(1, rows.length);
  const t = rows.reduce(
    (acc, r) => ({ inc: acc.inc + r.inc, exp: acc.exp + r.exp, rest: acc.rest + r.rest }),
    { inc: 0, exp: 0, rest: 0 },
  );
  return { inc: Math.round(t.inc / n), exp: Math.round(t.exp / n), rest: Math.round(t.rest / n) };
}

/** Change of a month's expenses compared with the average of the 3 previous months (null without history). */
export function expenseTrend(state: BudgetState, month: Month): number | null {
  const previous = history(state, addMonths(month, -1), 3).filter(r => r.exp > 0);
  if (previous.length === 0) return null;
  const avg = previous.reduce((acc, r) => acc + r.exp, 0) / previous.length;
  return avg ? ((monthTotals(state, month).exp - avg) / avg) * 100 : null;
}

/** Expenses by category over `months`, largest first. */
export function expensesByCategory(
  state: BudgetState,
  months: readonly Month[],
): { category: Category; amount: Cents }[] {
  const totals = new Map<string, Cents>();
  for (const month of months) {
    for (const o of occurrences(state, month)) {
      if (o.kind !== 'exp') continue;
      const c = categoryOf(state.categories, o.categoryId);
      totals.set(c.id, (totals.get(c.id) ?? 0) + o.amount);
    }
  }
  return [...totals.entries()]
    .map(([id, amount]) => ({ category: categoryOf(state.categories, id), amount }))
    .sort((a, b) => b.amount - a.amount);
}
