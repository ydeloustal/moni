import { state } from '@/test/fixtures';
import { addGoal, deleteGoal, goalProgress, updateGoal } from '../goals';
import { futureValue, futureValueSeries } from '../simulator';

describe('goals', () => {
  it('adds, updates and deletes goals', () => {
    let s = addGoal(state(), { name: 'Voyage', target: 100000, saved: 0 }, 'g');
    s = updateGoal(s, 'g', { saved: 25000 });
    expect(s.goals).toEqual([{ id: 'g', name: 'Voyage', target: 100000, saved: 25000 }]);
    expect(deleteGoal(s, 'g').goals).toEqual([]);
  });

  it('estimates the delay at the pace of the savings plan', () => {
    const g = { id: 'g', name: 'Voyage', target: 100000, saved: 25000 };
    expect(goalProgress(g, 10000)).toEqual({
      status: 'estimated',
      percent: 25,
      left: 75000,
      months: 8,
    });
    expect(goalProgress(g, 0)).toEqual({ status: 'no-capacity', percent: 25, left: 75000 });
    expect(goalProgress({ ...g, saved: 120000 }, 0)).toEqual({
      status: 'reached',
      percent: 100,
      left: 0,
    });
  });
});

describe('simulator', () => {
  it('sums deposits without a rate', () => expect(futureValue(10000, 0, 2)).toBe(240000));
  it('grows above deposits with a rate', () =>
    expect(futureValue(10000, 3, 1)).toBeGreaterThan(120000));
  it('builds one point per year', () => {
    const series = futureValueSeries(10000, 0, 3);
    expect(series).toEqual([0, 120000, 240000, 360000]);
  });
});
