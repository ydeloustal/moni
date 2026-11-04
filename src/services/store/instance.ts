import { createRepository } from '@/services/storage/repository';
import { createBudgetStore } from './budgetStore';

/** The single store of the app, bound to the platform's storage. */
export const budgetStore = createBudgetStore(createRepository());
