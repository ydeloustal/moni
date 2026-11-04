import { rng, rule, state } from '@/test/fixtures';
import { currentBalance } from '../balance';
import { projection } from '../projection';
import { legacy, type LegacyState } from './legacyReference';

/**
 * Parity with the previous PHP/JS version: on 300 random budgets, current balance, monthly rest,
 * end-of-month balance and savings plan must be identical to the cent.
 */
describe('parity with the legacy PHP version (300 random budgets)', () => {
  it('gives the same balances and savings plan to the cent', () => {
    const r = rng(42);
    const pick = <T>(a: readonly T[]): T => a[Math.floor(r() * a.length)] as T;
    const months = ['', '2026-08', '2026-10', '2026-11', '2027-01', '2027-04', '2027-09'];
    for (let n = 0; n < 300; n++) {
      const entries = Array.from({ length: 1 + Math.floor(r() * 12) }, (_, i) => {
        let from = pick(months);
        let to = pick(months);
        if (from && to && to < from) [from, to] = [to, from];
        return {
          id: 'e' + i,
          type: r() < 0.3 ? ('inc' as const) : ('exp' as const),
          amount: Math.round(r() * 150000) / 100,
          day: 1 + Math.floor(r() * 31),
          from,
          to,
          active: r() > 0.1,
          cat: 'logement',
          name: 'e' + i,
        };
      });
      const soldeDate = `2026-${pick(['09', '10', '11'])}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`;
      const marks: Record<string, boolean> = {};
      const paid: Record<string, boolean> = {};
      for (const e of entries) {
        if (r() < 0.2) marks[`${e.id}|${soldeDate.slice(0, 7)}`] = r() < 0.5;
        if (r() < 0.2) paid[`${e.id}|${soldeDate.slice(0, 7)}`] = true;
      }
      const L: LegacyState = {
        entries,
        marks,
        paid,
        settings: {
          solde: Math.round((r() * 4000 - 1000) * 100) / 100,
          soldeDate,
          buffer: Math.round(r() * 200),
        },
      };
      const ref = legacy(L);
      const s = state(
        {
          rules: entries.map(e =>
            rule({
              id: e.id,
              kind: e.type,
              categoryId: e.type === 'inc' ? null : 'logement',
              amount: Math.round(e.amount * 100),
              day: e.day,
              from: e.from || null,
              to: e.to || null,
              active: e.active,
            }),
          ),
          marks,
          paid: Object.fromEntries(Object.keys(paid).map(k => [k, true as const])),
        },
        {
          balance: Math.round(L.settings.solde * 100),
          balanceDate: soldeDate,
          buffer: L.settings.buffer * 100,
        },
      );

      expect(currentBalance(s)).toBe(Math.round(ref.curBal() * 100));
      const ours = projection(s);
      const theirs = ref.plan();
      ours.forEach((row, k) => {
        const expected = theirs[k];
        if (!expected) throw new Error('missing legacy row');
        expect(row.month).toBe(expected.m);
        expect(Math.abs(row.endBalance - expected.bal * 100)).toBeLessThanOrEqual(1);
        expect(Math.abs(row.rest - expected.full * 100)).toBeLessThanOrEqual(1);
        expect(Math.abs(row.savedCumul - expected.saved * 100)).toBeLessThanOrEqual(1);
      });
    }
  });
});
