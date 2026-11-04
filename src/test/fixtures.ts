/** Shared test builders (not shipped: only imported from __tests__). */
import { emptyState } from '@/features/budget/domain/state';
import type { BudgetState, Rule, SavingsAccount, Tx } from '@/types/domain';

export function rule(p: Partial<Rule> & Pick<Rule, 'id' | 'amount'>): Rule {
  return {
    kind: 'exp',
    name: p.id,
    categoryId: 'logement',
    day: 1,
    every: 1,
    anchor: '2026-01',
    from: null,
    to: null,
    note: '',
    active: true,
    subscription: false,
    ...p,
  };
}

export function tx(p: Partial<Tx> & Pick<Tx, 'id' | 'amount' | 'date'>): Tx {
  return { kind: 'exp', name: p.id, categoryId: 'alimentation', note: '', ...p };
}

export function account(p: Partial<SavingsAccount> = {}): SavingsAccount {
  return {
    id: 'a',
    product: 'livret-a',
    name: '',
    bank: '',
    balance: 1_000_000,
    balanceDate: '2025-12-31',
    customRate: null,
    rateCheckedOn: null,
    openedOn: null,
    movements: [],
    ...p,
  };
}

export function state(
  p: Partial<BudgetState> = {},
  settings: Partial<BudgetState['settings']> = {},
): BudgetState {
  const s = emptyState('2026-10-03');
  return {
    ...s,
    ...p,
    settings: {
      ...s.settings,
      balance: 62510,
      balanceDate: '2026-10-03',
      buffer: 5000,
      ...settings,
    },
  };
}

/** Deterministic pseudo-random generator (reproducible tests). */
export function rng(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 1_000_000) / 1_000_000;
  };
}
