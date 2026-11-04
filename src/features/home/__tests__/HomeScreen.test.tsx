import { screen } from '@testing-library/react-native';
import { act } from 'react';
import { addRule, updateSettings } from '@/features/budget/domain/actions';
import { budgetStore } from '@/services/store/instance';
import { renderWithProviders } from '@/test/render';
import { HomeScreen } from '../HomeScreen';

// jest.mock calls are hoisted above the imports by babel-jest.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => false },
}));

jest.mock('@/services/store/instance', () => {
  const { createBudgetStore } = jest.requireActual('@/services/store/budgetStore');
  const { createSqliteRepository } = jest.requireActual(
    '@/services/storage/sqlite/sqliteRepository',
  );
  const { nodeSqlite } = jest.requireActual('@/services/storage/__tests__/nodeSqlite');
  const db = nodeSqlite();
  return { budgetStore: createBudgetStore(createSqliteRepository(async () => db)) };
});

describe('HomeScreen', () => {
  beforeAll(async () => {
    await budgetStore.init('2026-11-04');
  });

  it('welcomes a new user', async () => {
    await renderWithProviders(<HomeScreen />);
    expect(screen.getByText('Bienvenue dans Moni')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Saisir mon solde' })).toBeOnTheScreen();
  });

  it('shows the current balance and the end-of-month forecast', async () => {
    await act(async () => {
      budgetStore.commit(s => updateSettings(s, { balance: 125040, balanceDate: '2026-11-04' }));
      budgetStore.commit(s =>
        addRule(s, {
          kind: 'exp',
          name: 'Loyer',
          amount: 55000,
          categoryId: 'logement',
          day: 5,
          every: 1,
          anchor: '2026-01',
          from: null,
          to: null,
          note: '',
          active: true,
          subscription: false,
        }),
      );
    });
    await renderWithProviders(<HomeScreen />);
    expect(screen.getByLabelText(/^Solde actuel : 1\s250,40\s€$/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Fin de mois prévue, 700,40\s€$/)).toBeOnTheScreen();
    expect(screen.queryByText('Bienvenue dans Moni')).toBeNull();
  });
});
