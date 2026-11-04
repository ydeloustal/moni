/**
 * Benchmarks. Deliberately GENERIC: Moni never recommends a specific financial product
 * (boundary with investment advice).
 */
import { baseMonth } from '@/features/budget/domain/balance';
import { categoryOf } from '@/features/categories/domain/defaults';
import {
  monthTotals,
  occurrences,
  ruleOccursIn,
  signOf,
  totalsOf,
  txsOfMonth,
} from '@/features/budget/domain/occurrences';
import { projection } from '@/features/budget/domain/projection';
import { subscriptionCost } from '@/features/subscriptions/domain/subscriptions';
import type { BudgetState } from '@/types/domain';
import { addMonths, monthLabel, monthRange, type Month } from '@/utils/dates';
import { formatMoney, formatMoneyRounded, formatMoneySigned, type Cents } from '@/utils/money';

/** 50/30/20 benchmark of a month: shares of income spent on needs, wants, and left over. */
export function rule503020(
  state: BudgetState,
  month: Month,
): { needs: number; wants: number; savings: number } | null {
  const list = occurrences(state, month);
  const t = totalsOf(list);
  if (t.inc <= 0) return null;
  let needs = 0;
  for (const o of list) {
    if (o.kind === 'exp' && categoryOf(state.categories, o.categoryId).need) needs += o.amount;
  }
  return {
    needs: (needs / t.inc) * 100,
    wants: ((t.exp - needs) / t.inc) * 100,
    savings: (t.rest / t.inc) * 100,
  };
}

/** Net total over `count` months with / without the cut lines ("what if I stopped this?"). */
export function cutSimulation(
  state: BudgetState,
  count = 12,
): { withCuts: Cents; withoutCuts: Cents } {
  let withCuts = 0;
  let withoutCuts = 0;
  for (const month of monthRange(baseMonth(state), count)) {
    for (const rule of state.rules) {
      const value = signOf(rule.kind) * rule.amount;
      if (ruleOccursIn(rule, month)) withCuts += value;
      if (ruleOccursIn(rule, month, true)) withoutCuts += value;
    }
    for (const tx of txsOfMonth(state, month)) {
      const value = signOf(tx.kind) * tx.amount;
      withCuts += value;
      withoutCuts += value;
    }
  }
  return { withCuts, withoutCuts };
}

export type InsightTone = 'bad' | 'warn' | 'good' | 'info';
export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
}

/** Contract ends below this amount are not worth a benchmark (15 €). */
const MIN_CONTRACT_END = 1500;

export function insights(state: BudgetState, selected: Month): Insight[] {
  const out: Insight[] = [];
  const plan = projection(state);
  for (const row of plan) {
    if (row.rest >= 0) continue;
    const covered = row.endBalance >= 0;
    out.push({
      id: `red-${row.month}`,
      tone: covered ? 'warn' : 'bad',
      title: `${monthLabel(row.month)} est dans le rouge (${formatMoneySigned(row.rest)})`,
      detail: covered
        ? `Couvert par ce qui reste des mois précédents (solde prévu ${formatMoney(row.endBalance)}). Garde cet argent de côté d'ici là.`
        : `Il manque ${formatMoney(-row.endBalance)}. Réduis ou décale une dépense, ou prévois une rentrée d'argent.`,
    });
  }

  const months = plan.map(p => p.month);
  const first = months[0] ?? baseMonth(state);
  const last = months[months.length - 1] ?? first;
  for (const rule of state.rules) {
    const end = rule.to;
    if (rule.kind !== 'exp' || !rule.active || !end || end < first || end >= last) continue;
    if (rule.amount < MIN_CONTRACT_END) continue;
    // A line continued by "change from a given month" is not an end of contract.
    if (state.rules.some(o => o !== rule && o.name === rule.name && o.from && o.from > end))
      continue;
    out.push({
      id: `end-${rule.id}`,
      tone: 'good',
      title: `${rule.name} se termine en ${monthLabel(end)}`,
      detail: `Tu libères ${formatMoney(rule.amount)} ${rule.every === 1 ? 'par mois' : 'par échéance'} à partir de ${monthLabel(addMonths(end, 1))}.`,
    });
  }

  const subs = subscriptionCost(state, first);
  if (subs.count > 0) {
    out.push({
      id: 'subscriptions',
      tone: 'info',
      title: `Abonnements : ${formatMoney(subs.monthly)} par mois`,
      detail: `Soit ${formatMoneyRounded(subs.yearly)} par an pour ${subs.count} abonnement${subs.count > 1 ? 's' : ''}. Vérifie ceux que tu utilises vraiment.`,
    });
  }

  const shares = rule503020(state, selected);
  if (shares) {
    out.push({
      id: '503020',
      tone: 'info',
      title: 'Repère 50 / 30 / 20',
      detail: `Besoins ${Math.round(shares.needs)} % (repère 50), envies ${Math.round(shares.wants)} % (repère 30), reste ${Math.round(shares.savings)} % (repère 20). C'est un repère courant, pas une règle.`,
    });
  }

  const avgExpenses =
    months.reduce((acc, m) => acc + monthTotals(state, m).exp, 0) / Math.max(1, months.length);
  if (avgExpenses > 0) {
    out.push({
      id: 'emergency-fund',
      tone: 'info',
      title: 'Épargne de précaution',
      detail: `Un repère courant est de garder environ 3 mois de dépenses de côté, soit ≈ ${formatMoneyRounded(avgExpenses * 3)}, sur une épargne disponible à tout moment.`,
    });
  }

  const order: Record<InsightTone, number> = { bad: 0, warn: 1, good: 2, info: 3 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}
