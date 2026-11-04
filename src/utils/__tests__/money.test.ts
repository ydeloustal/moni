import { formatMoneySigned, parseAmount, parsePercent } from '../money';

describe('money in cents', () => {
  it('parses French input without floating point errors', () => {
    expect(parseAmount('0,1') + parseAmount('0,2')).toBe(30);
    expect(parseAmount('1 234,56 €')).toBe(123456);
    expect(parseAmount('12.5')).toBe(1250);
    expect(parseAmount('-3')).toBeNaN();
    expect(parseAmount('1,234')).toBeNaN();
    expect(parseAmount('abc')).toBeNaN();
  });

  it('parses percentages within [0, 100]', () => {
    expect(parsePercent('1,7')).toBe(1.7);
    expect(parsePercent('2.25 %')).toBe(2.25);
    expect(parsePercent('101')).toBeNaN();
    expect(parsePercent('x')).toBeNaN();
  });

  it('formats signed amounts with a true minus sign', () => {
    expect(formatMoneySigned(-1200)).toMatch(/^−12,00/);
    expect(formatMoneySigned(1200)).toMatch(/^\+12,00/);
    expect(formatMoneySigned(0)).toMatch(/^0,00/);
  });
});
