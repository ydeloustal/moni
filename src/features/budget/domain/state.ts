import { DEFAULT_CATEGORIES } from '@/features/categories/domain/defaults';
import { SCHEMA_VERSION, type BudgetState } from '@/types/domain';
import type { Day } from '@/utils/dates';

/** Default safety margin: 50 €. */
export const DEFAULT_BUFFER = 5000;

export function emptyState(today: Day): BudgetState {
  return {
    schemaVersion: SCHEMA_VERSION,
    rules: [],
    txs: [],
    categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
    savings: [],
    goals: [],
    marks: {},
    paid: {},
    settings: {
      balance: 0,
      balanceDate: today,
      buffer: DEFAULT_BUFFER,
      simAltRate: null,
      lastBackupAt: null,
    },
  };
}
