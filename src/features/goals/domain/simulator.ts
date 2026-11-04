import type { Cents } from '@/utils/money';

/**
 * Capital after `years` years with a monthly deposit, monthly compounding.
 * Simulator only (constant rate): not a regulated account computation.
 */
export function futureValue(
  monthly: Cents,
  ratePct: number,
  years: number,
  start: Cents = 0,
): Cents {
  let balance = start;
  const r = ratePct / 100 / 12;
  for (let i = 0; i < years * 12; i++) balance = (balance + monthly) * (1 + r);
  return Math.round(balance);
}

/** Yearly points (0 … years) for the simulator chart. */
export function futureValueSeries(monthly: Cents, ratePct: number, years: number): Cents[] {
  return Array.from({ length: years + 1 }, (_, i) => futureValue(monthly, ratePct, i));
}
