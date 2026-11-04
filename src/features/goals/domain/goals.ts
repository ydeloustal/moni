import type { BudgetState, Goal } from '@/types/domain';
import type { Cents } from '@/utils/money';
import { newId } from '@/utils/id';

export type GoalInput = Omit<Goal, 'id'>;

export const addGoal = (state: BudgetState, input: GoalInput, id = newId()): BudgetState => ({
  ...state,
  goals: [...state.goals, { ...input, id }],
});

export const updateGoal = (
  state: BudgetState,
  id: string,
  changes: Partial<GoalInput>,
): BudgetState => ({
  ...state,
  goals: state.goals.map(g => (g.id === id ? { ...g, ...changes } : g)),
});

export const deleteGoal = (state: BudgetState, id: string): BudgetState => ({
  ...state,
  goals: state.goals.filter(g => g.id !== id),
});

/** Below this monthly capacity (1 €), no delay is estimated. */
const MIN_MONTHLY_CAPACITY = 100;

export type GoalProgress =
  | { status: 'reached'; percent: number; left: 0 }
  | { status: 'estimated'; percent: number; left: Cents; months: number }
  | { status: 'no-capacity'; percent: number; left: Cents };

/**
 * Progress of a goal and estimated delay at the pace of the savings plan
 * (`monthlyCapacity` = average monthly amount the plan can set aside).
 */
export function goalProgress(goal: Goal, monthlyCapacity: Cents): GoalProgress {
  const percent = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  const left = Math.max(0, goal.target - goal.saved);
  if (left === 0) return { status: 'reached', percent: 100, left: 0 };
  if (monthlyCapacity < MIN_MONTHLY_CAPACITY) return { status: 'no-capacity', percent, left };
  return { status: 'estimated', percent, left, months: Math.ceil(left / monthlyCapacity) };
}
