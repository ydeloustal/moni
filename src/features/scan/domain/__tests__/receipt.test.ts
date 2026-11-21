import { amountsIn, guessDate, guessTotal, normalize, type TextLine } from '../receipt';

/** Lines stacked vertically, one per row, full width. */
const stacked = (...texts: string[]): TextLine[] =>
  texts.map((text, i) => ({ text, box: [0, i * 40, 600, 30] }));

describe('normalize and amountsIn', () => {
  it('fixes O read for 0 in numbers and strips accents', () => {
    expect(normalize('Total à payer 12,5O €')).toBe('TOTAL A PAYER 12,50 €');
    expect(normalize('Carrefour Ouest')).toBe('CARREFOUR OUEST');
  });

  it('reads French and English amounts in cents', () => {
    expect(amountsIn('2 x 3,20  6,40')).toEqual([320, 640]);
    expect(amountsIn('TOTAL 1 234,56 EUR')).toEqual([123456]);
    expect(amountsIn('Total 1.234,56')).toEqual([123456]);
    expect(amountsIn('Amount 12.50')).toEqual([1250]);
    expect(amountsIn('REMISE -3,20')).toEqual([-320]);
  });

  it('ignores quantities, percentages and codes', () => {
    expect(amountsIn('TVA 5,50%')).toEqual([]);
    expect(amountsIn('Ticket 0042 caisse 3')).toEqual([]);
  });
});

describe('guessTotal', () => {
  it('prefers the amount to pay over subtotal, VAT and change', () => {
    const lines = stacked(
      'SUPER U',
      'PAIN 1,20',
      'SOUS-TOTAL 25,40',
      'REMISE FIDELITE -2,00',
      'TOTAL TTC 23,40',
      'TVA 5,5% 1,22',
      'CB 23,40',
      'RENDU 0,00',
    );
    expect(guessTotal(lines)).toEqual({ value: 2340, confidence: 'high', line: 4 });
  });

  it('reads the amount from the right column of the same row', () => {
    const lines: TextLine[] = [
      { text: 'TOTAL', box: [20, 500, 120, 30] },
      { text: 'LAIT 1,05', box: [20, 460, 400, 30] },
      { text: '18,90', box: [450, 504, 100, 28] },
      { text: '1,05', box: [450, 460, 100, 28] },
    ];
    expect(guessTotal(lines)?.value).toBe(1890);
  });

  it('falls back to the card payment line, then to the largest amount', () => {
    expect(guessTotal(stacked('X 3,00', 'CARTE BANCAIRE 9,99'))).toEqual({
      value: 999,
      confidence: 'medium',
      line: 1,
    });
    expect(guessTotal(stacked('ARTICLE 3,00', 'ARTICLE 12,00'))).toEqual({
      value: 1200,
      confidence: 'low',
      line: 1,
    });
    expect(guessTotal(stacked('BONJOUR'))).toBeNull();
  });
});

describe('guessDate', () => {
  it('reads day/month/year in French order', () => {
    expect(guessDate(stacked('MAGASIN', '21/11/2026 14:32'))?.value).toBe('2026-11-21');
    expect(guessDate(stacked('LE 03.02.26'))?.value).toBe('2026-02-03');
  });

  it('skips impossible dates', () => {
    expect(guessDate(stacked('REF 45/13/2026', '01-12-2026'))?.value).toBe('2026-12-01');
    expect(guessDate(stacked('AUCUNE DATE'))).toBeNull();
  });
});
