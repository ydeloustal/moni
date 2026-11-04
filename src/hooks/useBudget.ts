import { useSyncExternalStore } from 'react';
import { budgetStore } from '@/services/store/instance';
import type { StoreSnapshot } from '@/services/store/budgetStore';
import type { BudgetState } from '@/types/domain';

export function useStoreSnapshot(): StoreSnapshot {
  return useSyncExternalStore(
    budgetStore.subscribe,
    budgetStore.getSnapshot,
    budgetStore.getSnapshot,
  );
}

/** The loaded state. Screens are only rendered once the store is ready (see app/_layout.tsx). */
export function useBudget(): BudgetState {
  const { state } = useStoreSnapshot();
  if (!state) throw new Error('Budget state is not loaded');
  return state;
}

export const commit = budgetStore.commit;
export const undo = budgetStore.undo;
