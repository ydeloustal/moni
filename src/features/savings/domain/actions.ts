import type { BudgetState, SavingsAccount, SavingsMovement } from '@/types/domain';
import type { Day } from '@/utils/dates';
import type { Cents } from '@/utils/money';
import { newId } from '@/utils/id';

export type SavingsInput = Omit<SavingsAccount, 'id' | 'movements'>;

const mapAccount = (
  state: BudgetState,
  id: string,
  fn: (a: SavingsAccount) => SavingsAccount,
): BudgetState => ({ ...state, savings: state.savings.map(a => (a.id === id ? fn(a) : a)) });

export function addSavings(state: BudgetState, input: SavingsInput, id = newId()): BudgetState {
  return { ...state, savings: [...state.savings, { ...input, id, movements: [] }] };
}

export const updateSavings = (
  state: BudgetState,
  id: string,
  changes: Partial<SavingsInput>,
): BudgetState => mapAccount(state, id, a => ({ ...a, ...changes }));

/** New typed balance: earlier movements are absorbed into it. */
export const setSavingsBalance = (
  state: BudgetState,
  id: string,
  balance: Cents,
  date: Day,
): BudgetState =>
  mapAccount(state, id, a => ({
    ...a,
    balance,
    balanceDate: date,
    movements: a.movements.filter(m => m.date > date),
  }));

export const addSavingsMovement = (
  state: BudgetState,
  id: string,
  movement: Omit<SavingsMovement, 'id'>,
  movementId = newId(),
): BudgetState =>
  mapAccount(state, id, a => ({
    ...a,
    movements: [...a.movements, { ...movement, id: movementId }].sort((x, y) =>
      x.date.localeCompare(y.date),
    ),
  }));

export const deleteSavingsMovement = (
  state: BudgetState,
  id: string,
  movementId: string,
): BudgetState =>
  mapAccount(state, id, a => ({ ...a, movements: a.movements.filter(m => m.id !== movementId) }));

export const deleteSavings = (state: BudgetState, id: string): BudgetState => ({
  ...state,
  savings: state.savings.filter(a => a.id !== id),
});
