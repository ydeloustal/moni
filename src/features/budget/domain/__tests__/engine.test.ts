import { rule, state, tx } from '@/test/fixtures';
import {
  addRule,
  addTx,
  deleteRule,
  deleteTx,
  duplicateRule,
  duplicateTx,
  setBalance,
  setPaid,
  setRuleActive,
  updateRuleFrom,
  updateTx,
} from '../actions';
import {
  balanceCandidates,
  currentBalance,
  expectedBalance,
  overdue,
  paidSinceCount,
} from '../balance';
import { monthStatus, monthTotals, occurrences, resolveKey, ruleOccursIn } from '../occurrences';
import { dailyBalance, pendingFlow, perDay, projection } from '../projection';

describe('rule frequency', () => {
  it('handles monthly rules with inclusive bounds', () => {
    const r = rule({ id: 'a', amount: 100, from: '2026-03', to: '2026-05' });
    expect(['2026-02', '2026-03', '2026-05', '2026-06'].map(m => ruleOccursIn(r, m))).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it('aligns quarterly, half-yearly and yearly rules on their reference month', () => {
    const q = rule({ id: 'q', amount: 100, every: 3, anchor: '2026-02' });
    expect(
      ['2025-11', '2026-01', '2026-02', '2026-05', '2026-08'].map(m => ruleOccursIn(q, m)),
    ).toEqual([true, false, true, true, true]);
    const h = rule({ id: 'h', amount: 100, every: 6, anchor: '2026-03' });
    expect(ruleOccursIn(h, '2026-09')).toBe(true);
    expect(ruleOccursIn(h, '2026-06')).toBe(false);
    const b = rule({ id: 'b', amount: 100, every: 2, anchor: '2026-01' });
    expect(ruleOccursIn(b, '2026-03')).toBe(true);
    expect(ruleOccursIn(b, '2026-04')).toBe(false);
    const y = rule({ id: 'y', amount: 100, every: 12, anchor: '2026-09' });
    expect(ruleOccursIn(y, '2027-09')).toBe(true);
    expect(ruleOccursIn(y, '2027-08')).toBe(false);
  });

  it('does not count a cut line, except in simulations', () => {
    const r = rule({ id: 'a', amount: 100, active: false });
    expect(ruleOccursIn(r, '2026-10')).toBe(false);
    expect(ruleOccursIn(r, '2026-10', true)).toBe(true);
    expect(monthTotals(state({ rules: [r] }), '2026-10').exp).toBe(0);
  });

  it('places day 31 on the last day of short months', () => {
    const s = state({ rules: [rule({ id: 'a', amount: 100, day: 31 })] });
    expect(occurrences(s, '2026-02')[0]?.date).toBe('2026-02-28');
  });
});

describe('balance and projection', () => {
  const base = state(
    {
      rules: [
        rule({ id: 'loyer', amount: 40000, day: 12 }),
        rule({ id: 'salaire', kind: 'inc', categoryId: null, amount: 120000, day: 8 }),
        rule({ id: 'tel', amount: 2000, day: 2, categoryId: 'abonnements', subscription: true }),
      ],
    },
    { balance: 50000, balanceDate: '2026-10-10' },
  );

  it('treats an occurrence dated before the balance as already included (never counted twice)', () => {
    const st = monthStatus(base, '2026-10');
    expect(st.find(o => o.id === 'salaire')?.inAnchor).toBe(true);
    expect(st.find(o => o.id === 'loyer')?.inAnchor).toBe(false);
    expect(pendingFlow(base, '2026-10')).toBe(-40000);
  });

  it('updates the current balance and removes the occurrence from the projection when ticked', () => {
    const s2 = setPaid(base, 'loyer|2026-10', true);
    expect(currentBalance(s2)).toBe(10000);
    expect(paidSinceCount(s2)).toBe(1);
    expect(pendingFlow(s2, '2026-10')).toBe(0);
    expect(projection(s2)[0]?.endBalance).toBe(projection(base)[0]?.endBalance);
  });

  it('ignores a tick on an occurrence already in the balance', () => {
    expect(currentBalance(setPaid(base, 'salaire|2026-10', true))).toBe(50000);
  });

  it('never lets the savings plan take the account below the margin', () => {
    const s = state(
      {
        rules: [
          rule({ id: 'sal', kind: 'inc', categoryId: null, amount: 100000, day: 1 }),
          rule({ id: 'exp', amount: 60000, day: 2 }),
          rule({ id: 'big', amount: 300000, day: 5, from: '2027-03', to: '2027-03' }),
        ],
      },
      { balance: 200000, balanceDate: '2026-10-01', buffer: 5000 },
    );
    const plan = projection(s);
    for (const row of plan) expect(row.cash).toBeGreaterThanOrEqual(5000);
    expect(plan.find(r => r.month === '2027-03')?.cash).toBe(5000);
    expect(plan[plan.length - 1]?.savedCumul).toBeGreaterThan(0);
  });

  it('computes spendable per day and the daily balance', () => {
    const today = '2026-10-20';
    const pd = perDay(base, '2026-10', today);
    expect(pd.days).toBe(12);
    expect(pd.amount).toBe(Math.floor((projection(base)[0]?.endBalance ?? 0) / 12));
    const daily = dailyBalance(base, '2026-10', today);
    expect(daily[0]).toEqual({ day: 20, balance: 50000 });
    expect(daily[daily.length - 1]?.balance).toBe(projection(base)[0]?.endBalance);
    expect(dailyBalance(base, '2026-09', today)).toEqual([]);
  });

  it('lists overdue occurrences since the balance date', () => {
    expect(overdue(base, '2026-10-15').map(o => o.id)).toEqual(['loyer']);
    expect(overdue(base, '2026-10-11')).toEqual([]);
  });

  it('resolves keys and ignores deleted or cut lines', () => {
    expect(resolveKey(base, 'loyer|2026-10')?.amount).toBe(40000);
    expect(resolveKey(base, 'unknown|2026-10')).toBeNull();
    expect(resolveKey(setRuleActive(base, 'loyer', false), 'loyer|2026-10')).toBeNull();
    expect(resolveKey(base, 'garbage')).toBeNull();
  });
});

describe('one-off operations', () => {
  it('ticks a real expense after the balance date and lowers the current balance', () => {
    const s = addTx(
      state({}, { balance: 10000, balanceDate: '2026-10-03' }),
      {
        kind: 'exp',
        name: 'Courses',
        amount: 4210,
        categoryId: 'alimentation',
        date: '2026-10-12',
        note: '',
      },
      '2026-10-12',
      'c1',
    );
    expect(currentBalance(s)).toBe(5790);
    expect(monthTotals(s, '2026-10').exp).toBe(4210);
    expect(pendingFlow(s, '2026-10')).toBe(0);
  });

  it('keeps a future expense as upcoming', () => {
    const s = addTx(
      state(),
      {
        kind: 'exp',
        name: 'Cadeau',
        amount: 3000,
        categoryId: 'loisirs',
        date: '2026-12-20',
        note: '',
      },
      '2026-10-12',
      'c2',
    );
    expect(currentBalance(s)).toBe(62510);
    expect(pendingFlow(s, '2026-12')).toBe(-3000);
  });

  it('removes ticks when an operation is deleted', () => {
    let s = addTx(
      state(),
      { kind: 'exp', name: 'x', amount: 100, categoryId: null, date: '2026-10-10', note: '' },
      '2026-10-12',
      'x1',
    );
    expect(s.paid['t:x1']).toBe(true);
    s = deleteTx(s, 'x1');
    expect(s.paid['t:x1']).toBeUndefined();
    expect(occurrences(s, '2026-10')).toEqual([]);
  });

  it('drops the category when an operation becomes an income', () => {
    const s = updateTx(state({ txs: [tx({ id: 't', amount: 1, date: '2026-10-01' })] }), 't', {
      kind: 'inc',
    });
    expect(s.txs[0]?.categoryId).toBeNull();
  });

  it('duplicates operations and rules', () => {
    const s = state({
      rules: [rule({ id: 'r', amount: 10 })],
      txs: [tx({ id: 't', amount: 5, date: '2026-10-05' })],
    });
    const d = duplicateTx(duplicateRule(s, 'r', 'r2'), 't', '2026-10-06', 't2');
    expect(d.rules.map(r => r.id)).toEqual(['r', 'r2']);
    expect(d.txs.map(t => t.id)).toEqual(['t', 't2']);
    expect(d.paid['t:t2']).toBe(true);
    expect(duplicateTx(s, 'missing', '2026-10-06')).toBe(s);
  });
});

describe('rule changes', () => {
  it('keeps history and moves ticks when changed "from January"', () => {
    let s = state({
      rules: [rule({ id: 'loyer', amount: 40000, day: 12, from: '2026-01' })],
      paid: { 'loyer|2026-11': true, 'loyer|2026-12': true },
    });
    s = updateRuleFrom(s, 'loyer', '2026-12', { amount: 42000 }, 'loyer2');
    expect(monthTotals(s, '2026-11').exp).toBe(40000);
    expect(monthTotals(s, '2026-12').exp).toBe(42000);
    expect(monthTotals(s, '2027-06').exp).toBe(42000);
    expect(s.paid).toEqual({ 'loyer|2026-11': true, 'loyer2|2026-12': true });
  });

  it('splits a line without a start month', () => {
    let s = state({ rules: [rule({ id: 'a', amount: 1000 })] });
    s = updateRuleFrom(s, 'a', '2027-01', { amount: 1500 }, 'b');
    expect(s.rules.map(r => [r.id, r.from, r.to, r.amount])).toEqual([
      ['a', null, '2026-12', 1000],
      ['b', '2027-01', null, 1500],
    ]);
  });

  it('rewrites the whole line when the month is on or before its start', () => {
    const s = updateRuleFrom(
      state({ rules: [rule({ id: 'a', amount: 1, from: '2026-05' })] }),
      'a',
      '2026-05',
      {
        amount: 2,
      },
    );
    expect(s.rules).toHaveLength(1);
    expect(s.rules[0]?.amount).toBe(2);
  });

  it('removes ticks when a rule is deleted', () => {
    const s = deleteRule(
      state({
        rules: [rule({ id: 'a', amount: 1 })],
        marks: { 'a|2026-10': true, 'b|2026-10': false },
        paid: { 'a|2026-11': true },
      }),
      'a',
    );
    expect(s.marks).toEqual({ 'b|2026-10': false });
    expect(s.paid).toEqual({});
  });

  it('normalises bounds and drops the category of an income', () => {
    const s = addRule(
      state(),
      {
        kind: 'inc',
        name: 'x',
        amount: 1,
        categoryId: 'logement',
        day: 1,
        every: 1,
        anchor: '2026-01',
        from: '2026-12',
        to: '2026-03',
        note: '',
        active: true,
        subscription: false,
      },
      'r',
    );
    expect(s.rules[0]).toMatchObject({ from: '2026-03', to: '2026-12', categoryId: null });
  });
});

describe('balance update', () => {
  it('offers the period since the old balance, ticked according to the new date', () => {
    const s = state(
      {
        rules: [rule({ id: 'a', amount: 1000, day: 5 }), rule({ id: 'b', amount: 2000, day: 25 })],
      },
      { balanceDate: '2026-10-10' },
    );
    const c = balanceCandidates(s, '2026-11-15');
    expect(c.map(x => [x.key, x.defaultIncluded])).toEqual([
      ['b|2026-10', true],
      ['a|2026-11', true],
      ['b|2026-11', false],
    ]);
  });

  it('computes the expected balance from the ticks so that a gap can be reported', () => {
    const s = state(
      {
        rules: [rule({ id: 'a', amount: 1000, day: 5 }), rule({ id: 'b', amount: 2000, day: 25 })],
      },
      { balance: 50000, balanceDate: '2026-10-10' },
    );
    const c = balanceCandidates(s, '2026-11-15');
    // b|2026-10 and a|2026-11 went through: 50 000 − 2 000 − 1 000
    expect(expectedBalance(s, c, {})).toBe(47000);
    expect(expectedBalance(s, c, { 'a|2026-11': false })).toBe(48000);
  });

  it('resets "paid since" ticks', () => {
    const s = setBalance(setPaid(state(), 'x|2026-10', true), 12345, '2026-10-20', {
      'a|2026-10': false,
    });
    expect(s.settings).toMatchObject({ balance: 12345, balanceDate: '2026-10-20' });
    expect(s.paid).toEqual({});
    expect(s.marks).toEqual({ 'a|2026-10': false });
  });
});
