import type { BudgetState, Rule } from '@/types/domain';
import type { Month } from '@/utils/dates';
import type { Cents } from '@/utils/money';

const isRunning = (rule: Rule, asOf: Month): boolean =>
  rule.active &&
  rule.kind === 'exp' &&
  rule.subscription &&
  !(rule.to && rule.to < asOf) &&
  !(rule.from && rule.from > asOf);

/** Subscription lines running in month `asOf`, most expensive first (smoothed monthly cost). */
export function activeSubscriptions(
  state: BudgetState,
  asOf: Month,
): { rule: Rule; monthly: Cents; yearly: Cents }[] {
  return state.rules
    .filter(r => isRunning(r, asOf))
    .map(rule => {
      const yearly = rule.amount * (12 / rule.every);
      return { rule, monthly: Math.round(yearly / 12), yearly: Math.round(yearly) };
    })
    .sort((a, b) => b.yearly - a.yearly || a.rule.name.localeCompare(b.rule.name));
}

/** Cost of the subscriptions running in month `asOf`: per month (smoothed) and per year. */
export function subscriptionCost(
  state: BudgetState,
  asOf: Month,
): { monthly: Cents; yearly: Cents; count: number } {
  let yearly = 0;
  let count = 0;
  for (const rule of state.rules) {
    if (!isRunning(rule, asOf)) continue;
    yearly += rule.amount * (12 / rule.every);
    count++;
  }
  return { monthly: Math.round(yearly / 12), yearly: Math.round(yearly), count };
}
