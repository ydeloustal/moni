import { account } from '@/test/fixtures';
import { accountToForm, validateAccount } from '../accountForm';

const TODAY = '2026-10-22';

describe('account form', () => {
  it('validates a Livret A without a typed rate', () => {
    const r = validateAccount(
      { ...accountToForm(undefined, TODAY), balance: '1 500,00' },
      undefined,
      TODAY,
    );
    expect(r).toMatchObject({
      ok: true,
      input: { product: 'livret-a', balance: 150000, customRate: null, rateCheckedOn: null },
    });
  });

  it('requires the rate of a bank account and dates its check', () => {
    const base = {
      ...accountToForm(undefined, TODAY),
      product: 'livret-bancaire' as const,
      balance: '10',
    };
    expect(validateAccount(base, undefined, TODAY).ok).toBe(false);
    expect(validateAccount({ ...base, customRate: '3,25' }, undefined, TODAY)).toMatchObject({
      ok: true,
      input: { customRate: 3.25, rateCheckedOn: TODAY },
    });
  });

  it('keeps the previous check date when the rate is unchanged', () => {
    const previous = account({
      product: 'livret-bancaire',
      customRate: 3,
      rateCheckedOn: '2026-01-01',
    });
    const r = validateAccount(accountToForm(previous, TODAY), previous, TODAY);
    expect(r).toMatchObject({ ok: true, input: { rateCheckedOn: '2026-01-01' } });
  });

  it('reports unreadable values', () => {
    const r = validateAccount(
      {
        ...accountToForm(undefined, TODAY),
        balance: 'abc',
        balanceDate: '31/02/2026',
        openedOn: 'x',
      },
      undefined,
      TODAY,
    );
    expect(r.ok === false && Object.keys(r.errors).sort()).toEqual([
      'balance',
      'balanceDate',
      'openedOn',
    ]);
  });
});
