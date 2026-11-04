import type { BudgetState, Category } from '@/types/domain';
import { newId } from '@/utils/id';

export type CategoryInput = Omit<Category, 'id'>;

export function addCategory(state: BudgetState, input: CategoryInput, id = newId()): BudgetState {
  return { ...state, categories: [...state.categories, { ...input, id }] };
}

export function updateCategory(
  state: BudgetState,
  id: string,
  changes: Partial<CategoryInput>,
): BudgetState {
  return {
    ...state,
    categories: state.categories.map(c => (c.id === id ? { ...c, ...changes } : c)),
  };
}

/** Deletes a category: its rules and operations move to `replacementId`. */
export function deleteCategory(
  state: BudgetState,
  id: string,
  replacementId: string | null,
): BudgetState {
  const reassign = <T extends { categoryId: string | null; kind: string }>(item: T): T =>
    item.categoryId === id
      ? { ...item, categoryId: item.kind === 'inc' ? null : replacementId }
      : item;
  return {
    ...state,
    categories: state.categories.filter(c => c.id !== id),
    rules: state.rules.map(reassign),
    txs: state.txs.map(reassign),
  };
}

/** Number of rules and operations using a category (shown before deletion). */
export function categoryUsage(state: BudgetState, id: string): number {
  return (
    state.rules.filter(r => r.categoryId === id).length +
    state.txs.filter(t => t.categoryId === id).length
  );
}
