import { rule, tx } from '@/test/fixtures';
import { emptyOperationForm, ruleToForm, txToForm, validateOperation } from '../operationForm';

const TODAY = '2026-10-22';

describe('operation form', () => {
  it('validates a one-off expense', () => {
    const r = validateOperation({
      ...emptyOperationForm(TODAY, 'tx'),
      name: ' Courses ',
      amount: '42,10',
    });
    expect(r).toEqual({
      ok: true,
      nature: 'tx',
      input: {
        kind: 'exp',
        name: 'Courses',
        amount: 4210,
        categoryId: 'alimentation',
        date: TODAY,
        note: '',
      },
    });
  });

  it('reports every invalid field in French', () => {
    const r = validateOperation({
      ...emptyOperationForm(TODAY, 'rule'),
      amount: '-3',
      day: '32',
      from: '13/2026',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['amount', 'day', 'from', 'name']);
  });

  it('builds a quarterly rule anchored on the given month, income without category', () => {
    const r = validateOperation({
      ...emptyOperationForm(TODAY, 'rule', 'inc'),
      name: 'Prime',
      amount: '300',
      every: 3,
      anchor: '02/2027',
      day: '31',
      subscription: true,
    });
    expect(r).toMatchObject({
      ok: true,
      input: {
        kind: 'inc',
        categoryId: null,
        every: 3,
        anchor: '2027-02',
        day: 31,
        subscription: false,
      },
    });
  });

  it('rejects an end month before the start month', () => {
    const r = validateOperation({
      ...emptyOperationForm(TODAY),
      name: 'x',
      amount: '1',
      from: '05/2027',
      to: '01/2027',
    });
    expect(r.ok === false && r.errors.to).toBeTruthy();
  });

  it('round-trips existing rules and operations', () => {
    const existing = rule({
      id: 'r',
      amount: 55000,
      day: 5,
      every: 12,
      anchor: '2026-09',
      from: '2026-09',
      to: null,
      note: 'n',
    });
    const back = validateOperation(ruleToForm(existing, TODAY));
    expect(back).toMatchObject({
      ok: true,
      input: { amount: 55000, day: 5, every: 12, anchor: '2026-09', from: '2026-09', to: null },
    });
    const t = tx({ id: 't', amount: 999, date: '2026-01-31' });
    expect(validateOperation(txToForm(t, TODAY))).toMatchObject({
      ok: true,
      input: { date: '2026-01-31', amount: 999 },
    });
  });
});
