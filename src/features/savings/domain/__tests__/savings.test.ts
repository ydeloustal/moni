import { account, state } from '@/test/fixtures';
import bundled from '../../data/regulated.json';
import {
  addSavings,
  addSavingsMovement,
  deleteSavingsMovement,
  setSavingsBalance,
} from '../actions';
import { BUNDLED_RATES as rates } from '../bundledRates';
import {
  accountRateAt,
  ceilingInfo,
  customRateNeedsCheck,
  estimateInterest,
  fortnightOf,
  fortnightStart,
  savingsBalance,
} from '../interest';
import { isStale, parseRatesFile, rateAt, type RatesFile } from '../rates';

describe('bundled rates file', () => {
  it('is valid and every rate has a source', () => {
    for (const p of Object.values(rates.products)) {
      for (const r of p.rates) expect(rates.sources[r.source]).toBeDefined();
    }
  });

  it('gives the rates in force on 22 October 2026, sourced from the Journal officiel', () => {
    const a = rateAt(rates, 'livret-a', '2026-10-22');
    expect(a).toMatchObject({ status: 'ok', rate: 1.7 });
    expect(a.source?.evidence).toBe('officielle');
    expect(a.source?.url).toContain('legifrance.gouv.fr');
    expect(rateAt(rates, 'lep', '2026-10-22').rate).toBe(2.5);
    expect(rateAt(rates, 'ldds', '2026-10-22').rate).toBe(1.7);
    expect(rateAt(rates, 'cel', '2026-10-22').rate).toBe(1.25);
  });

  it('switches rates on the 1st: 1.5 % on 31 July, 1.7 % on 1 August', () => {
    expect(rateAt(rates, 'livret-a', '2026-07-31').rate).toBe(1.5);
    expect(rateAt(rates, 'livret-a', '2026-08-01').rate).toBe(1.7);
  });

  it('never presents a rate as current after its known validity', () => {
    const r = rateAt(rates, 'livret-a', '2027-02-01');
    expect(r.status).toBe('expired');
    expect(r.rate).toBeNull();
    expect(r.last?.rate).toBe(1.7);
    expect(isStale(rates, '2027-02-01')).toBe(true);
    expect(isStale(rates, '2026-10-22')).toBe(false);
  });

  it('reports unknown rates before the history', () => {
    expect(rateAt(rates, 'livret-a', '2019-01-01').status).toBe('unknown');
    expect(rateAt(rates, 'nope', '2026-01-01').status).toBe('unknown');
  });
});

describe('rates file validation', () => {
  const clone = (): RatesFile => JSON.parse(JSON.stringify(bundled)) as RatesFile;
  const first = (f: RatesFile, product: string) => {
    const r = f.products[product]?.rates;
    if (!r?.[0] || !r[1]) throw new Error('fixture');
    return r;
  };
  it.each<[string, (f: RatesFile) => void]>([
    ['absurd rate', f => void (first(f, 'livret-a')[0]!.rate = 45)],
    ['overlapping periods', f => void (first(f, 'livret-a')[1]!.from = '2021-01-01')],
    ['unknown source', f => void (first(f, 'lep')[0]!.source = 'missing')],
    ['non https url', f => void (f.sources['jo-2026-08']!.url = 'http://example.fr')],
    ['unknown schema', f => void ((f as unknown as { schema: number }).schema = 2)],
  ])('rejects: %s', (_name, mutate) => {
    const f = clone();
    mutate(f);
    expect(() => parseRatesFile(f)).toThrow(/Fichier de taux invalide/);
  });
});

describe('fortnights', () => {
  it('computes index and start', () => {
    expect(fortnightOf('2026-01-01')).toBe(0);
    expect(fortnightOf('2026-01-15')).toBe(0);
    expect(fortnightOf('2026-01-16')).toBe(1);
    expect(fortnightOf('2026-12-31')).toBe(23);
    expect(fortnightStart(2026, 9)).toBe('2026-05-16');
  });
});

describe('interest (fortnight rule)', () => {
  it('10 000 € all year 2026: 2 fortnights at 1.7 %, 12 at 1.5 %, 10 at 1.7 % = 160.00 €', () => {
    const e = estimateInterest(rates, account(), 2026);
    expect(e).toEqual({
      interest: 16000,
      endBalance: 1_016_000,
      missingFortnights: 0,
      assumedConstantBefore: false,
    });
  });

  it('starts paying a deposit made on 1 May from 16 May', () => {
    const e = estimateInterest(
      rates,
      account({ movements: [{ id: 'm', date: '2026-05-01', amount: 100_000 }] }),
      2026,
    );
    // 1 000 € × (5 fortnights at 1.5 % + 10 at 1.7 %) / 24 = 10.2083 €
    expect(e.interest).toBe(16000 + 1021);
  });

  it('stops paying a withdrawal made on 20 May from 16 May', () => {
    const e = estimateInterest(
      rates,
      account({ movements: [{ id: 'm', date: '2026-05-20', amount: -100_000 }] }),
      2026,
    );
    expect(e.interest).toBe(16000 - 1021);
  });

  it('flags fortnights without a published rate in 2027 instead of inventing one', () => {
    expect(estimateInterest(rates, account(), 2027).missingFortnights).toBe(22);
  });

  it('LEP 2026: 2.5 % all year except January (2.7 %)', () => {
    const e = estimateInterest(rates, account({ product: 'lep' }), 2026);
    expect(e.interest).toBe(Math.round((1_000_000 * (2.7 * 2 + 2.5 * 22)) / 100 / 24));
  });
});

describe('rate per account type', () => {
  it('PEL: rate of the opening generation', () => {
    expect(
      accountRateAt(rates, account({ product: 'pel', openedOn: '2024-06-10' }), '2026-10-22').rate,
    ).toBe(2.25);
    expect(
      accountRateAt(rates, account({ product: 'pel', openedOn: '2019-03-01' }), '2026-10-22').rate,
    ).toBe(1);
  });

  it('Livret jeune: typed rate, flagged when below the legal floor', () => {
    expect(
      accountRateAt(rates, account({ product: 'livret-jeune', customRate: 1.5 }), '2026-10-22'),
    ).toMatchObject({
      rate: 1.5,
      belowFloor: true,
      origin: 'custom',
    });
    expect(
      accountRateAt(rates, account({ product: 'livret-jeune', customRate: 2 }), '2026-10-22')
        .belowFloor,
    ).toBe(false);
  });

  it('bank account: typed rate, check reminder after 6 months', () => {
    const a = account({ product: 'livret-bancaire', customRate: 3, rateCheckedOn: '2026-01-01' });
    expect(accountRateAt(rates, a, '2026-10-22')).toMatchObject({ rate: 3, origin: 'custom' });
    expect(customRateNeedsCheck(a, '2026-10-22')).toBe(true);
    expect(customRateNeedsCheck({ ...a, rateCheckedOn: '2026-09-01' }, '2026-10-22')).toBe(false);
    expect(customRateNeedsCheck(account(), '2026-10-22')).toBe(false);
    expect(accountRateAt(rates, account({ product: 'autre' }), '2026-10-22').origin).toBe('none');
  });

  it('ceiling and estimated balance', () => {
    const a = account({
      balance: 2_300_000,
      movements: [{ id: 'm', date: '2026-03-01', amount: -10_000 }],
    });
    expect(savingsBalance(a, '2026-10-22')).toBe(2_290_000);
    expect(ceilingInfo(rates, a, '2026-10-22')).toEqual({
      ceiling: 2_295_000,
      over: false,
      room: 5000,
    });
    expect(ceilingInfo(rates, account({ product: 'autre' }), '2026-10-22')).toBeNull();
  });
});

describe('savings actions', () => {
  it('adds an account, movements, and absorbs them into a new balance', () => {
    const { id: _id, movements: _m, ...input } = account();
    let s = addSavings(state(), input, 'acc');
    s = addSavingsMovement(s, 'acc', { date: '2026-06-01', amount: 5000 }, 'm2');
    s = addSavingsMovement(s, 'acc', { date: '2026-03-01', amount: 1000 }, 'm1');
    expect(s.savings[0]?.movements.map(m => m.id)).toEqual(['m1', 'm2']);
    expect(deleteSavingsMovement(s, 'acc', 'm1').savings[0]?.movements).toHaveLength(1);
    s = setSavingsBalance(s, 'acc', 2_000_000, '2026-04-01');
    expect(s.savings[0]).toMatchObject({ balance: 2_000_000, balanceDate: '2026-04-01' });
    expect(s.savings[0]?.movements.map(m => m.id)).toEqual(['m2']);
  });
});
