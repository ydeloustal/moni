import { createIndexedDbRepository } from './indexedDbRepository';
import type { BudgetRepository } from './types';

export function createRepository(): BudgetRepository {
  return createIndexedDbRepository('moni');
}
