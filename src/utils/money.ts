/**
 * Money is always stored as integer CENTS. Floating-point euros never enter a computation,
 * so that 0.10 € + 0.20 € is exactly 0.30 €.
 */
export type Cents = number;

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const currencyRounded = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export const toCents = (euros: number): Cents => Math.round(euros * 100);
export const toEuros = (cents: Cents): number => cents / 100;

/**
 * Parses a user-typed amount ("12,50", "12.5", "1 234,56 €") into cents.
 * Returns NaN when unreadable. Negative amounts are rejected: the sign comes from the kind (income/expense).
 */
export function parseAmount(input: string): Cents {
  const s = String(input)
    .replace(/[\s  €]/g, '')
    .replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return NaN;
  return Math.round(parseFloat(s) * 100);
}

/** Parses a percentage ("1,7") into a number (1.7). NaN when unreadable or outside [0, 100]. */
export function parsePercent(input: string): number {
  const s = String(input).replace(/[\s%]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,3})?$/.test(s)) return NaN;
  const value = parseFloat(s);
  return value >= 0 && value <= 100 ? value : NaN;
}

export const formatMoney = (cents: Cents): string => currency.format(cents / 100);
export const formatMoneyRounded = (cents: Cents): string =>
  currencyRounded.format(Math.round(cents / 100));
/** Explicit sign with a true minus sign: "+12,00 €" / "−12,00 €". */
export const formatMoneySigned = (cents: Cents): string =>
  (cents > 0 ? '+' : cents < 0 ? '−' : '') + currency.format(Math.abs(cents) / 100);
export const formatPercent = (value: number): string =>
  value.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %';
/** Value to prefill an input with: 1250 → "12,50". */
export const centsToInput = (cents: Cents): string => (cents / 100).toFixed(2).replace('.', ',');
export const percentToInput = (value: number | null): string =>
  value === null ? '' : String(value).replace('.', ',');
