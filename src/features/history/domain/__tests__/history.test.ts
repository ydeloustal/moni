import { rule, state, tx } from '@/test/fixtures';
import { averages, expenseTrend, expensesByCategory, forecastRows, history } from '../history';

describe('history and statistics', () => {
  const s = state({
    rules: [
      rule({ id: 'sal', kind: 'inc', categoryId: null, amount: 200000 }),
      rule({ id: 'loyer', amount: 60000, categoryId: 'logement' }),
    ],
    txs: [
      tx({ id: 'c1', amount: 10000, date: '2026-07-10', categoryId: 'alimentation' }),
      tx({ id: 'c2', amount: 40000, date: '2026-10-10', categoryId: 'alimentation' }),
    ],
  });

  it('lists the months ending with the selected one', () => {
    const rows = history(s, '2026-10', 6);
    expect(rows.map(r => r.month)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ]);
    expect(rows[5]).toMatchObject({ inc: 200000, exp: 100000, rest: 100000 });
    expect(forecastRows(s, '2026-11', 12)).toHaveLength(12);
  });

  it('averages totals', () => {
    expect(averages(history(s, '2026-10', 2))).toEqual({ inc: 200000, exp: 80000, rest: 120000 });
    expect(averages([])).toEqual({ inc: 0, exp: 0, rest: 0 });
  });

  it('compares expenses with the average of the 3 previous months', () => {
    // Jul 70 000, Aug 60 000, Sep 60 000 → average 63 333; Oct 100 000 → +57.9 %
    expect(expenseTrend(s, '2026-10')).toBeCloseTo(57.89, 1);
    expect(expenseTrend(state(), '2026-10')).toBeNull();
  });

  it('sums expenses by category, largest first', () => {
    expect(expensesByCategory(s, ['2026-10']).map(x => [x.category.id, x.amount])).toEqual([
      ['logement', 60000],
      ['alimentation', 40000],
    ]);
  });
});
