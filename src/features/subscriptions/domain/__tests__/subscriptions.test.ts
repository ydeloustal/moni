import { rule, state } from '@/test/fixtures';
import { activeSubscriptions, subscriptionCost } from '../subscriptions';

describe('subscriptions', () => {
  const s = state({
    rules: [
      rule({ id: 'a', amount: 999, subscription: true }),
      rule({ id: 'b', amount: 3000, every: 3, subscription: true }),
      rule({ id: 'c', amount: 500, subscription: true, to: '2026-01' }),
      rule({ id: 'd', amount: 700, subscription: true, active: false }),
      rule({ id: 'e', amount: 800 }),
    ],
  });

  it('smooths the cost per month and per year, quarterly included', () => {
    expect(subscriptionCost(s, '2026-10')).toEqual({ monthly: 1999, yearly: 23988, count: 2 });
  });

  it('lists running subscriptions, most expensive first', () => {
    expect(activeSubscriptions(s, '2026-10').map(x => [x.rule.id, x.monthly, x.yearly])).toEqual([
      ['b', 1000, 12000],
      ['a', 999, 11988],
    ]);
  });
});
