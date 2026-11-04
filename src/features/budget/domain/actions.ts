/**
 * State changes. PURE functions: they return a new state without touching the old one,
 * which enables undo, testing and (later) synchronisation.
 */
import type { BudgetState, Rule, Settings, Tx } from '@/types/domain';
import { addMonths, type Day, type Month } from '@/utils/dates';
import type { Cents } from '@/utils/money';
import { newId } from '@/utils/id';
import { parseRuleKey, ruleKey, txKey } from './keys';

const dropKeys = <T>(
  record: Record<string, T>,
  test: (key: string) => boolean,
): Record<string, T> => Object.fromEntries(Object.entries(record).filter(([key]) => !test(key)));

const belongsToRule = (ruleId: string) => (key: string) => parseRuleKey(key)?.ruleId === ruleId;

/* ---------- recurring rules ---------- */

export type RuleInput = Omit<Rule, 'id'>;

/** Consistent bounds (from ≤ to); no category for an income. */
function normalizeRule(rule: Rule): Rule {
  let { from, to } = rule;
  if (from && to && to < from) [from, to] = [to, from];
  return { ...rule, from, to, categoryId: rule.kind === 'inc' ? null : rule.categoryId };
}

export function addRule(state: BudgetState, input: RuleInput, id = newId()): BudgetState {
  return { ...state, rules: [...state.rules, normalizeRule({ ...input, id })] };
}

/** Simple change: rewrites the line for every month (past ones included). */
export function updateRule(
  state: BudgetState,
  id: string,
  changes: Partial<RuleInput>,
): BudgetState {
  return {
    ...state,
    rules: state.rules.map(r => (r.id === id ? normalizeRule({ ...r, ...changes }) : r)),
  };
}

/**
 * Change "from a given month": the old line stops the month before and a new one takes over.
 * Past months therefore stay exact (e.g. rent increased in January).
 * Ticks of the affected months follow the new line.
 */
export function updateRuleFrom(
  state: BudgetState,
  id: string,
  fromMonth: Month,
  changes: Partial<RuleInput>,
  newRuleId = newId(),
): BudgetState {
  const old = state.rules.find(r => r.id === id);
  if (!old) return state;
  if (old.from && fromMonth <= old.from) return updateRule(state, id, changes);
  if (old.to && fromMonth > old.to) return state;
  const next = normalizeRule({
    ...old,
    ...changes,
    id: newRuleId,
    from: fromMonth,
    to: changes.to !== undefined ? changes.to : old.to,
  });
  const moveKeys = <T>(record: Record<string, T>): Record<string, T> => {
    const out: Record<string, T> = {};
    for (const [key, value] of Object.entries(record)) {
      const parsed = parseRuleKey(key);
      const moved = parsed && parsed.ruleId === id && parsed.month >= fromMonth;
      out[moved ? ruleKey(newRuleId, parsed.month) : key] = value;
    }
    return out;
  };
  return {
    ...state,
    rules: state.rules.flatMap(r =>
      r.id === id ? [{ ...r, to: addMonths(fromMonth, -1) }, next] : [r],
    ),
    marks: moveKeys(state.marks),
    paid: moveKeys(state.paid),
  };
}

export function deleteRule(state: BudgetState, id: string): BudgetState {
  const mine = belongsToRule(id);
  return {
    ...state,
    rules: state.rules.filter(r => r.id !== id),
    marks: dropKeys(state.marks, mine),
    paid: dropKeys(state.paid, mine),
  };
}

export const setRuleActive = (state: BudgetState, id: string, active: boolean): BudgetState =>
  updateRule(state, id, { active });

export function duplicateRule(state: BudgetState, id: string, newRuleId = newId()): BudgetState {
  const rule = state.rules.find(r => r.id === id);
  return rule ? { ...state, rules: [...state.rules, { ...rule, id: newRuleId }] } : state;
}

/* ---------- one-off operations ---------- */

export type TxInput = Omit<Tx, 'id'>;

/**
 * Adds a real operation. If it happened after the balance date and no later than today,
 * it is ticked as paid: the current balance takes it into account immediately.
 */
export function addTx(state: BudgetState, input: TxInput, today: Day, id = newId()): BudgetState {
  const tx: Tx = { ...input, id, categoryId: input.kind === 'inc' ? null : input.categoryId };
  const isPast = input.date > state.settings.balanceDate && input.date <= today;
  const paid = isPast ? { ...state.paid, [txKey(id)]: true as const } : state.paid;
  return { ...state, txs: [...state.txs, tx], paid };
}

export function updateTx(state: BudgetState, id: string, changes: Partial<TxInput>): BudgetState {
  return {
    ...state,
    txs: state.txs.map(t => {
      if (t.id !== id) return t;
      const next = { ...t, ...changes };
      return { ...next, categoryId: next.kind === 'inc' ? null : next.categoryId };
    }),
  };
}

export function deleteTx(state: BudgetState, id: string): BudgetState {
  const key = txKey(id);
  return {
    ...state,
    txs: state.txs.filter(t => t.id !== id),
    marks: dropKeys(state.marks, k => k === key),
    paid: dropKeys(state.paid, k => k === key),
  };
}

export function duplicateTx(
  state: BudgetState,
  id: string,
  today: Day,
  newTxId = newId(),
): BudgetState {
  const tx = state.txs.find(t => t.id === id);
  if (!tx) return state;
  const { id: _ignored, ...input } = tx;
  return addTx(state, input, today, newTxId);
}

/* ---------- ticks and balance ---------- */

/** Ticks / unticks "gone through my account" for an occurrence. */
export function setPaid(state: BudgetState, key: string, paid: boolean): BudgetState {
  const next = { ...state.paid };
  if (paid) next[key] = true;
  else delete next[key];
  return { ...state, paid: next };
}

/**
 * New balance read in the bank app. `included`: for each offered occurrence, true when it already went through
 * (so it is part of this balance). "Paid since" ticks start over.
 */
export function setBalance(
  state: BudgetState,
  balance: Cents,
  date: Day,
  included: Record<string, boolean>,
): BudgetState {
  return {
    ...state,
    settings: { ...state.settings, balance, balanceDate: date },
    marks: { ...included },
    paid: {},
  };
}

/* ---------- settings ---------- */

export const updateSettings = (state: BudgetState, changes: Partial<Settings>): BudgetState => ({
  ...state,
  settings: { ...state.settings, ...changes },
});
