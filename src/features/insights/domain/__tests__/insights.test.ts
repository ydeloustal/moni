import { rule, state } from '@/test/fixtures';
import { cutSimulation, insights, rule503020 } from '../insights';

describe('benchmarks', () => {
  it('computes the 50/30/20 shares', () => {
    const s = state({
      rules: [
        rule({ id: 'sal', kind: 'inc', categoryId: null, amount: 100000 }),
        rule({ id: 'loyer', amount: 50000 }),
        rule({ id: 'cine', amount: 20000, categoryId: 'loisirs' }),
      ],
    });
    expect(rule503020(s, '2026-10')).toEqual({ needs: 50, wants: 20, savings: 30 });
    expect(rule503020(state(), '2026-10')).toBeNull();
  });

  it('simulates cut lines', () => {
    const s = state({
      rules: [rule({ id: 'a', amount: 1000 }), rule({ id: 'b', amount: 500, active: false })],
    });
    expect(cutSimulation(s)).toEqual({ withCuts: -12000, withoutCuts: -18000 });
  });

  it('flags red months, contract ends, subscriptions and the emergency fund, most serious first', () => {
    const s = state(
      {
        rules: [
          rule({ id: 'sal', kind: 'inc', categoryId: null, amount: 150000, day: 1 }),
          rule({ id: 'loyer', amount: 60000, day: 5 }),
          rule({ id: 'credit', amount: 20000, day: 10, to: '2027-02' }),
          rule({
            id: 'netflix',
            amount: 1399,
            day: 15,
            subscription: true,
            categoryId: 'abonnements',
          }),
          rule({ id: 'impots', amount: 300000, day: 15, from: '2027-05', to: '2027-05' }),
        ],
      },
      { balance: 10000, balanceDate: '2026-10-01' },
    );
    const list = insights(s, '2026-10');
    const ids = list.map(i => i.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'red-2027-05',
        'end-credit',
        'subscriptions',
        '503020',
        'emergency-fund',
      ]),
    );
    expect(list[0]?.tone).toMatch(/bad|warn/);
    expect(list.find(i => i.id === 'end-credit')?.title).toBe('credit se termine en février 2027');
  });

  it('does not report the end of a line continued by a change "from a given month"', () => {
    const s = state({
      rules: [
        rule({ id: 'a', name: 'Loyer', amount: 40000, to: '2026-12' }),
        rule({ id: 'b', name: 'Loyer', amount: 42000, from: '2027-01' }),
      ],
    });
    expect(insights(s, '2026-10').some(i => i.id.startsWith('end-'))).toBe(false);
  });
});
